-- Hàm ghi nhiều dòng trong một giao dịch. SECURITY INVOKER: chạy với quyền người gọi nên RLS vẫn áp dụng.

-- Lưu điểm danh một buổi: tạo buổi nếu chưa có, thay toàn bộ điểm danh.
-- p_rows: [{"student_id": "...", "status": "present|absent|excused"}]
create function public.save_attendance(p_class uuid, p_date date, p_rows jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare v_org uuid; v_session uuid;
begin
  select org_id into v_org from public.classes where id = p_class;
  if v_org is null then raise exception 'Lớp không tồn tại hoặc bạn không có quyền'; end if;

  insert into public.sessions (org_id, class_id, date) values (v_org, p_class, p_date)
  on conflict (org_id, class_id, date) do update set date = excluded.date
  returning id into v_session;

  delete from public.attendance where session_id = v_session;
  insert into public.attendance (org_id, session_id, student_id, status)
  select v_org, v_session, (r ->> 'student_id')::uuid, r ->> 'status' from jsonb_array_elements(p_rows) r;
  return v_session;
end $$;

-- Lưu điểm + nhận xét của một bài kiểm tra cho nhiều học sinh.
-- p_rows: [{"student_id": "...", "score": 8.5 | null, "comment": "..."}]
-- Có điểm → bài làm ở trạng thái 'approved'. Không điểm, không nhận xét → xóa bản ghi trống (giữ lại nếu có ảnh/AI).
create function public.save_scores(p_exam uuid, p_rows jsonb) returns void
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
      set score = null, status = case when status = 'approved' then 'uploaded' else status end,
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

revoke execute on function public.save_attendance, public.save_scores from public, anon;
grant execute on function public.save_attendance, public.save_scores to authenticated;
