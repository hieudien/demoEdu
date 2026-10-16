-- EduManager · schema đa trung tâm (multi-tenant).
-- Mọi bảng có org_id; khóa ngoại dùng cặp (id, org_id) để một dòng không thể trỏ sang dữ liệu của org khác.

-- ───────── Tổ chức & người dùng ─────────
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('center', 'solo')),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.orgs (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'teacher')),
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  unique (id, org_id)
);
create index on public.profiles (org_id);

create table public.org_settings (
  org_id uuid primary key references public.orgs (id) on delete cascade,
  bank text not null default 'MB',
  account text not null default '',
  account_name text not null default '',
  zalo_template text,
  zalo_oa_id text
);

-- ───────── Danh mục ─────────
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  name text not null,
  phone text not null default '',
  email text not null default '',
  unique (id, org_id)
);
create index on public.teachers (org_id);
create unique index on public.teachers (profile_id) where profile_id is not null;

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  unique (id, org_id)
);
create index on public.subjects (org_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  dob date,
  parent_name text not null default '',
  parent_phone text not null default '',
  parent_zalo_id text,
  created_at timestamptz not null default now(),
  unique (id, org_id)
);
create index on public.students (org_id);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  subject_id uuid,
  teacher_id uuid,
  days smallint[] not null default '{}',          -- 0 = Chủ nhật … 6 = Thứ 7
  time_start time not null default '18:00',
  time_end time not null default '19:30',
  room text not null default '',
  fee integer not null default 0 check (fee >= 0), -- đồng / tháng
  unique (id, org_id),
  foreign key (subject_id, org_id) references public.subjects (id, org_id) on delete set null (subject_id),
  foreign key (teacher_id, org_id) references public.teachers (id, org_id) on delete set null (teacher_id)
);
create index on public.classes (org_id);
create index on public.classes (teacher_id);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  student_id uuid not null,
  class_id uuid not null,
  start_date date not null default current_date,
  end_date date,
  foreign key (student_id, org_id) references public.students (id, org_id) on delete cascade,
  foreign key (class_id, org_id) references public.classes (id, org_id) on delete cascade
);
create index on public.enrollments (org_id);
create index on public.enrollments (class_id);
create index on public.enrollments (student_id);
create unique index on public.enrollments (student_id, class_id) where end_date is null;

-- ───────── Học vụ ─────────
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  class_id uuid not null,
  date date not null,
  unique (class_id, date),
  unique (id, org_id),
  foreign key (class_id, org_id) references public.classes (id, org_id) on delete cascade
);
create index on public.sessions (org_id);

create table public.attendance (
  org_id uuid not null references public.orgs (id) on delete cascade,
  session_id uuid not null,
  student_id uuid not null,
  status text not null check (status in ('present', 'absent', 'excused')),
  primary key (session_id, student_id),
  foreign key (session_id, org_id) references public.sessions (id, org_id) on delete cascade,
  foreign key (student_id, org_id) references public.students (id, org_id) on delete cascade
);
create index on public.attendance (org_id);
create index on public.attendance (student_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  class_id uuid not null,
  date date not null,
  type text not null check (type in ('makeup', 'exam', 'off')),
  time_start time,
  note text not null default '',
  foreign key (class_id, org_id) references public.classes (id, org_id) on delete cascade
);
create index on public.events (org_id);
create index on public.events (class_id, date);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  class_id uuid not null,
  name text not null,
  date date not null,
  max_score numeric(5, 2) not null default 10 check (max_score > 0),
  brief text not null default '',                 -- đề bài / đáp án để AI đối chiếu
  unique (id, org_id),
  foreign key (class_id, org_id) references public.classes (id, org_id) on delete cascade
);
create index on public.exams (org_id);
create index on public.exams (class_id);

-- Bài làm của từng học sinh; điểm + nhận xét nằm ngay đây (thay bảng scores của bản demo).
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  exam_id uuid not null,
  student_id uuid not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'ai_graded', 'approved')),
  score numeric(5, 2) check (score >= 0),
  comment text not null default '',
  note text not null default '',                  -- ghi chú riêng của giáo viên
  ai_result jsonb,                                -- {score, comment, errors[], confidence}
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (exam_id, student_id),
  unique (id, org_id),
  foreign key (exam_id, org_id) references public.exams (id, org_id) on delete cascade,
  foreign key (student_id, org_id) references public.students (id, org_id) on delete cascade
);
create index on public.submissions (org_id);
create index on public.submissions (student_id);

create table public.submission_images (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  submission_id uuid not null,
  storage_path text not null,                     -- {org_id}/{exam_id}/{student_id}/{file}
  position smallint not null default 0,
  foreign key (submission_id, org_id) references public.submissions (id, org_id) on delete cascade
);
create index on public.submission_images (org_id);
create index on public.submission_images (submission_id);

-- ───────── Tài chính & liên lạc ─────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  student_id uuid not null,
  class_id uuid not null,
  period text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  amount integer not null check (amount >= 0),
  paid_at date not null default current_date,
  method text not null default 'cash' check (method in ('cash', 'bank')),
  bank_txn_id text,
  created_at timestamptz not null default now(),
  unique (student_id, class_id, period),
  unique (id, org_id),
  foreign key (student_id, org_id) references public.students (id, org_id) on delete cascade,
  foreign key (class_id, org_id) references public.classes (id, org_id) on delete cascade
);
create index on public.payments (org_id);
create index on public.payments (period);
create index on public.payments (class_id);

-- Giao dịch ngân hàng nhận từ webhook (SePay/Casso…), khớp với payments qua mã nội dung CK.
create table public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  provider text not null,
  txn_id text not null,
  amount integer not null,
  content text not null default '',
  raw jsonb,
  matched_payment_id uuid,
  created_at timestamptz not null default now(),
  unique (provider, txn_id),
  foreign key (matched_payment_id, org_id) references public.payments (id, org_id) on delete set null (matched_payment_id)
);
create index on public.bank_transactions (org_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  student_id uuid not null,
  exam_id uuid,
  channel text not null default 'zalo' check (channel in ('zalo', 'sms', 'email')),
  content text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  provider_msg_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (student_id, org_id) references public.students (id, org_id) on delete cascade,
  foreign key (exam_id, org_id) references public.exams (id, org_id) on delete cascade
);
create index on public.messages (org_id);
create index on public.messages (student_id);
create index on public.messages (exam_id);
