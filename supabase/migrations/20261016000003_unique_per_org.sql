-- Ràng buộc duy nhất phải kèm org_id: nếu không, một org có thể "dò" sự tồn tại của dữ liệu org khác
-- qua lỗi trùng khóa (unique_violation xảy ra trước khi kiểm tra khóa ngoại).
drop index public.enrollments_student_id_class_id_idx;
create unique index on public.enrollments (org_id, student_id, class_id) where end_date is null;

alter table public.sessions drop constraint sessions_class_id_date_key;
alter table public.sessions add constraint sessions_org_class_date_key unique (org_id, class_id, date);

alter table public.submissions drop constraint submissions_exam_id_student_id_key;
alter table public.submissions add constraint submissions_org_exam_student_key unique (org_id, exam_id, student_id);

alter table public.payments drop constraint payments_student_id_class_id_period_key;
alter table public.payments add constraint payments_org_student_class_period_key unique (org_id, student_id, class_id, period);

alter table public.attendance drop constraint attendance_pkey;
alter table public.attendance add primary key (org_id, session_id, student_id);
