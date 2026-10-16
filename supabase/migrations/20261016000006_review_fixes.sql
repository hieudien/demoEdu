-- Sửa các lỗi phát hiện khi review code.

-- 1. save_scores: xóa điểm + nhận xét thì phải xóa luôn nhận xét cũ (trước đây giữ lại khi bài có ảnh/AI)
create or replace function public.save_scores(p_exam uuid, p_rows jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_org uuid; v_max numeric; r jsonb; v_sid uuid; v_score numeric; v_comment text;
begin
  select org_id, max_score into v_org, v_max from public.exams where id = p_exam;
  if v_org is null then raise exception 'Bài kiểm tra không tồn tại hoặc bạn không có quyền'; end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    v_sid := (r ->> 'student_id')::uuid;
    v_score := nullif(r ->> 'score', '')::numeric;
    v_comment := coalesce(r ->> 'comment', '');
    if v_score is not null and (v_score < 0 or v_score > v_max) then
      raise exception 'Điểm phải từ 0 đến %', v_max;
    end if;

    if v_score is null and v_comment = '' then
      delete from public.submissions s
      where s.exam_id = p_exam and s.student_id = v_sid and s.ai_result is null
        and not exists (select 1 from public.submission_images i where i.submission_id = s.id);
      update public.submissions
      set score = null, comment = '', status = case when status = 'approved' then 'uploaded' else status end,
          reviewed_at = null, reviewed_by = null
      where exam_id = p_exam and student_id = v_sid;
    else
      insert into public.submissions (org_id, exam_id, student_id, status, score, comment, reviewed_at, reviewed_by)
      values (v_org, p_exam, v_sid, case when v_score is null then 'uploaded' else 'approved' end, v_score, v_comment,
              case when v_score is null then null else now() end, case when v_score is null then null else auth.uid() end)
      on conflict (org_id, exam_id, student_id) do update set
        score = excluded.score, comment = excluded.comment,
        status = case when excluded.score is null then (case when public.submissions.status = 'approved' then 'uploaded' else public.submissions.status end) else 'approved' end,
        reviewed_at = excluded.reviewed_at, reviewed_by = excluded.reviewed_by;
    end if;
  end loop;
end $$;

-- 2. Ngày mặc định theo giờ Việt Nam (current_date là UTC nên lệch 1 ngày trước 7h sáng)
alter table public.enrollments alter column start_date set default ((now() at time zone 'Asia/Ho_Chi_Minh')::date);
alter table public.payments alter column paid_at set default ((now() at time zone 'Asia/Ho_Chi_Minh')::date);

-- 3. Tổng hợp chuyên cần ngay trong DB (PostgREST giới hạn 1000 dòng/lần nên không gom ở client được)
create function public.attendance_by_student(p_class uuid)
returns table (student_id uuid, present int, excused int, absent int)
language sql stable security invoker set search_path = '' as $$
  select a.student_id,
         (count(*) filter (where a.status = 'present'))::int,
         (count(*) filter (where a.status = 'excused'))::int,
         (count(*) filter (where a.status = 'absent'))::int
  from public.attendance a join public.sessions s on s.id = a.session_id
  where s.class_id = p_class
  group by a.student_id
$$;
revoke execute on function public.attendance_by_student from public, anon;
grant execute on function public.attendance_by_student to authenticated;

-- 4. Storage: giáo viên chỉ đọc/ghi ảnh của bài kiểm tra thuộc lớp mình dạy (đường dẫn: org/exam/student/file)
create function public.try_uuid(t text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin return t::uuid; exception when others then return null; end $$;

drop policy submissions_storage_access on storage.objects;
create policy submissions_storage_access on storage.objects for all to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = (select public.auth_org())::text
         and ((select public.is_admin()) or public.teaches_exam(public.try_uuid((storage.foldername(name))[2]))))
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = (select public.auth_org())::text
         and ((select public.is_admin()) or public.teaches_exam(public.try_uuid((storage.foldername(name))[2]))));

-- 5. Lớp: giáo viên được xem/tạo/sửa lớp mình dạy nhưng KHÔNG được xóa (xóa lớp kéo theo xóa học phí) và không đổi học phí
drop policy classes_teacher on public.classes;
create policy classes_teacher_select on public.classes for select to authenticated
  using (org_id = (select public.auth_org()) and teacher_id = (select public.my_teacher_id()));
create policy classes_teacher_insert on public.classes for insert to authenticated
  with check (org_id = (select public.auth_org()) and teacher_id = (select public.my_teacher_id()));
create policy classes_teacher_update on public.classes for update to authenticated
  using (org_id = (select public.auth_org()) and teacher_id = (select public.my_teacher_id()))
  with check (org_id = (select public.auth_org()) and teacher_id = (select public.my_teacher_id()));

create function public.classes_guard_fee() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.fee is distinct from old.fee and not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới được đổi học phí';
  end if;
  return new;
end $$;
create trigger classes_guard_fee before update on public.classes
  for each row execute function public.classes_guard_fee();

-- 6. orgs: chỉ cho sửa tên và mẫu tin; không cho đổi loại tổ chức
revoke update on public.orgs from authenticated;
grant update (name, zalo_template) on public.orgs to authenticated;
