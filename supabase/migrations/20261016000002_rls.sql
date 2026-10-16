-- EduManager · phân quyền (RLS) + storage + hàm tạo org.
-- Quy tắc: người dùng chỉ thấy dữ liệu của org mình. Giáo viên chỉ thấy lớp mình dạy và những gì thuộc lớp đó;
-- học phí, giao dịch ngân hàng, cài đặt thanh toán chỉ owner/admin truy cập được.

-- ───────── Hàm trợ giúp (SECURITY DEFINER để tránh đệ quy RLS) ─────────
create function public.auth_org() returns uuid
language sql stable security definer set search_path = '' as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create function public.auth_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('owner', 'admin') from public.profiles where id = auth.uid()), false)
$$;

create function public.my_teacher_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.teachers where profile_id = auth.uid() limit 1
$$;

create function public.teaches_class(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.classes c
    where c.id = cid and c.org_id = public.auth_org() and c.teacher_id = public.my_teacher_id()
  )
$$;

create function public.teaches_session(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sessions s where s.id = sid and public.teaches_class(s.class_id))
$$;

create function public.teaches_exam(eid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.exams e where e.id = eid and public.teaches_class(e.class_id))
$$;

create function public.teaches_submission(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.submissions s where s.id = sid and public.teaches_exam(s.exam_id))
$$;

revoke execute on function public.auth_org, public.auth_role, public.is_admin, public.my_teacher_id,
  public.teaches_class, public.teaches_session, public.teaches_exam, public.teaches_submission from public, anon;
grant execute on function public.auth_org, public.auth_role, public.is_admin, public.my_teacher_id,
  public.teaches_class, public.teaches_session, public.teaches_exam, public.teaches_submission to authenticated;

-- ───────── Bật RLS ─────────
alter table public.orgs enable row level security;
alter table public.profiles enable row level security;
alter table public.org_settings enable row level security;
alter table public.teachers enable row level security;
alter table public.subjects enable row level security;
alter table public.students enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.events enable row level security;
alter table public.exams enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_images enable row level security;
alter table public.payments enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.messages enable row level security;

-- ───────── Policy ─────────
-- orgs / profiles / settings
create policy orgs_select on public.orgs for select to authenticated using (id = (select public.auth_org()));
create policy orgs_update on public.orgs for update to authenticated
  using (id = (select public.auth_org()) and (select public.is_admin()))
  with check (id = (select public.auth_org()));

create policy profiles_select on public.profiles for select to authenticated using (org_id = (select public.auth_org()));
-- profiles chỉ đọc; user chỉ sửa được full_name, phone của chính mình (xem GRANT bên dưới). Tạo/mời người dùng qua server.
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and org_id = (select public.auth_org()));

create policy settings_all on public.org_settings for all to authenticated
  using (org_id = (select public.auth_org()) and (select public.is_admin()))
  with check (org_id = (select public.auth_org()) and (select public.is_admin()));

-- danh mục: mọi thành viên org đọc; chỉ admin ghi
create policy teachers_select on public.teachers for select to authenticated using (org_id = (select public.auth_org()));
create policy teachers_write on public.teachers for all to authenticated
  using (org_id = (select public.auth_org()) and (select public.is_admin()))
  with check (org_id = (select public.auth_org()) and (select public.is_admin()));

create policy subjects_select on public.subjects for select to authenticated using (org_id = (select public.auth_org()));
create policy subjects_write on public.subjects for all to authenticated
  using (org_id = (select public.auth_org()) and (select public.is_admin()))
  with check (org_id = (select public.auth_org()) and (select public.is_admin()));

-- học sinh: mọi thành viên đọc/thêm/sửa (giáo viên cần ghi danh học sinh); chỉ admin xóa
create policy students_select on public.students for select to authenticated using (org_id = (select public.auth_org()));
create policy students_insert on public.students for insert to authenticated with check (org_id = (select public.auth_org()));
create policy students_update on public.students for update to authenticated
  using (org_id = (select public.auth_org())) with check (org_id = (select public.auth_org()));
create policy students_delete on public.students for delete to authenticated
  using (org_id = (select public.auth_org()) and (select public.is_admin()));

-- lớp: admin toàn quyền; giáo viên chỉ lớp của mình
create policy classes_admin on public.classes for all to authenticated
  using (org_id = (select public.auth_org()) and (select public.is_admin()))
  with check (org_id = (select public.auth_org()) and (select public.is_admin()));
create policy classes_teacher on public.classes for all to authenticated
  using (org_id = (select public.auth_org()) and teacher_id = (select public.my_teacher_id()))
  with check (org_id = (select public.auth_org()) and teacher_id = (select public.my_teacher_id()));

-- các bảng thuộc lớp: admin hoặc giáo viên của lớp đó
create policy enrollments_access on public.enrollments for all to authenticated
  using (org_id = (select public.auth_org()) and ((select public.is_admin()) or public.teaches_class(class_id)))
  with check (org_id = (select public.auth_org()) and ((select public.is_admin()) or public.teaches_class(class_id)));

create policy sessions_access on public.sessions for all to authenticated
  using (org_id = (select public.auth_org()) and ((select public.is_admin()) or public.teaches_class(class_id)))
  with check (org_id = (select public.auth_org()) and ((select public.is_admin()) or public.teaches_class(class_id)));

create policy attendance_access on public.attendance for all to authenticated
  using (org_id = (select public.auth_org()) and ((select public.is_admin()) or public.teaches_session(session_id)))
  with check (org_id = (select public.auth_org()) and ((select public.is_admin()) or public.teaches_session(session_id)));

create policy events_access on public.events for all to authenticated
  using (org_id = (select public.auth_org()) and ((select public.is_admin()) or public.teaches_class(class_id)))
  with check (org_id = (select public.auth_org()) and ((select public.is_admin()) or public.teaches_class(class_id)));

create policy exams_access on public.exams for all to authenticated
  using (org_id = (select public.auth_org()) and ((select public.is_admin()) or public.teaches_class(class_id)))
  with check (org_id = (select public.auth_org()) and ((select public.is_admin()) or public.teaches_class(class_id)));

create policy submissions_access on public.submissions for all to authenticated
  using (org_id = (select public.auth_org()) and ((select public.is_admin()) or public.teaches_exam(exam_id)))
  with check (org_id = (select public.auth_org()) and ((select public.is_admin()) or public.teaches_exam(exam_id)));

create policy submission_images_access on public.submission_images for all to authenticated
  using (org_id = (select public.auth_org()) and ((select public.is_admin()) or public.teaches_submission(submission_id)))
  with check (org_id = (select public.auth_org()) and ((select public.is_admin()) or public.teaches_submission(submission_id)));

create policy messages_access on public.messages for all to authenticated
  using (org_id = (select public.auth_org()) and ((select public.is_admin()) or (exam_id is not null and public.teaches_exam(exam_id))))
  with check (org_id = (select public.auth_org()) and ((select public.is_admin()) or (exam_id is not null and public.teaches_exam(exam_id))));

-- tài chính: chỉ admin
create policy payments_admin on public.payments for all to authenticated
  using (org_id = (select public.auth_org()) and (select public.is_admin()))
  with check (org_id = (select public.auth_org()) and (select public.is_admin()));
create policy bank_tx_admin on public.bank_transactions for all to authenticated
  using (org_id = (select public.auth_org()) and (select public.is_admin()))
  with check (org_id = (select public.auth_org()) and (select public.is_admin()));

-- profiles: chặn sửa role/org_id bằng quyền cột
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- ───────── Storage: ảnh bài làm (private, thư mục đầu = org_id) ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('submissions', 'submissions', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy submissions_storage_access on storage.objects for all to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = (select public.auth_org())::text)
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = (select public.auth_org())::text);

-- ───────── Đăng ký: tạo org + hồ sơ owner ─────────
create function public.create_org(p_name text, p_type text, p_full_name text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  if p_type not in ('center', 'solo') then raise exception 'Loại tổ chức không hợp lệ'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'Tài khoản đã thuộc một tổ chức'; end if;

  insert into public.orgs (name, type) values (p_name, p_type) returning id into v_org;
  insert into public.profiles (id, org_id, role, full_name) values (auth.uid(), v_org, 'owner', p_full_name);
  insert into public.org_settings (org_id) values (v_org);
  -- giáo viên cá nhân tự là giáo viên duy nhất của org
  if p_type = 'solo' then
    insert into public.teachers (org_id, profile_id, name) values (v_org, auth.uid(), p_full_name);
  end if;
  return v_org;
end $$;
revoke execute on function public.create_org from public, anon;
grant execute on function public.create_org to authenticated;
