-- Mẫu tin Zalo cần giáo viên đọc được (để soạn tin), nên chuyển từ org_settings (chỉ admin) sang orgs (mọi thành viên đọc, admin sửa).
alter table public.orgs add column zalo_template text;
update public.orgs o set zalo_template = s.zalo_template from public.org_settings s where s.org_id = o.id;
alter table public.org_settings drop column zalo_template;
