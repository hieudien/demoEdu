-- Kiểm tra RLS với 2 org giả. Chạy lặp lại được: khối DO luôn kết thúc bằng EXCEPTION nên mọi dữ liệu thử bị rollback.
--   Thành công: lỗi "RLS_TEST_OK ..."   Thất bại: lỗi "RLS_TEST_FAIL: <mô tả>"
do $$
declare
  u_a uuid := gen_random_uuid();   -- owner org A
  u_b uuid := gen_random_uuid();   -- owner org B
  u_t uuid := gen_random_uuid();   -- giáo viên org A
  org_a uuid; org_b uuid; t1 uuid; c1 uuid; c2 uuid; s1 uuid; s2 uuid; e1 uuid; e2 uuid; sb1 uuid;
  n int; passed int := 0;

  as_user text := 'select set_config(''role'', ''authenticated'', true), set_config(''request.jwt.claims'', json_build_object(''sub'', %L, ''role'', ''authenticated'')::text, true)';
begin
  -- helper nội tuyến: kiểm tra có đúng n dòng
  create temp table _res (ok boolean, msg text) on commit drop;

  insert into auth.users (id, aud, role, email) values
    (u_a, 'authenticated', 'authenticated', u_a || '@a.test'),
    (u_b, 'authenticated', 'authenticated', u_b || '@b.test'),
    (u_t, 'authenticated', 'authenticated', u_t || '@t.test');

  -- org A (owner)
  execute format(as_user, u_a); org_a := public.create_org('Trung tâm A', 'center', 'Owner A');
  -- org B (owner)
  execute 'reset role'; execute format(as_user, u_b); org_b := public.create_org('Trung tâm B', 'center', 'Owner B');
  execute 'reset role';

  -- dữ liệu org A, dựng bằng quyền cao (bỏ qua RLS)
  insert into public.profiles (id, org_id, role, full_name) values (u_t, org_a, 'teacher', 'GV A1');
  insert into public.teachers (org_id, profile_id, name) values (org_a, u_t, 'GV A1') returning id into t1;
  insert into public.classes (org_id, name, teacher_id, days) values (org_a, 'Lớp của GV', t1, '{1,3}') returning id into c1;
  insert into public.classes (org_id, name, days) values (org_a, 'Lớp admin', '{2,4}') returning id into c2;
  insert into public.students (org_id, name) values (org_a, 'HS 1') returning id into s1;
  insert into public.students (org_id, name) values (org_a, 'HS 2') returning id into s2;
  insert into public.enrollments (org_id, student_id, class_id) values (org_a, s1, c1), (org_a, s2, c2);
  insert into public.exams (org_id, class_id, name, date) values (org_a, c1, 'KT 1', current_date) returning id into e1;
  insert into public.exams (org_id, class_id, name, date) values (org_a, c2, 'KT 2', current_date) returning id into e2;
  insert into public.submissions (org_id, exam_id, student_id, status, score) values (org_a, e1, s1, 'approved', 8) returning id into sb1;
  insert into public.submissions (org_id, exam_id, student_id, status, score) values (org_a, e2, s2, 'approved', 6);
  insert into public.payments (org_id, student_id, class_id, period, amount) values (org_a, s1, c1, to_char(current_date, 'YYYY-MM'), 600000);

  -- 1. org B không thấy gì của org A
  execute format(as_user, u_b);
  select count(*) into n from public.students; if n <> 0 then raise exception 'RLS_TEST_FAIL: org B thấy % học sinh của org A', n; end if; passed := passed + 1;
  select count(*) into n from public.classes;  if n <> 0 then raise exception 'RLS_TEST_FAIL: org B thấy lớp của org A'; end if; passed := passed + 1;
  select count(*) into n from public.payments; if n <> 0 then raise exception 'RLS_TEST_FAIL: org B thấy học phí của org A'; end if; passed := passed + 1;
  select count(*) into n from public.orgs;     if n <> 1 then raise exception 'RLS_TEST_FAIL: org B thấy % org', n; end if; passed := passed + 1;

  -- 2. org B không ghi được vào org A, không trỏ chéo được sang dữ liệu org A
  begin
    insert into public.students (org_id, name) values (org_a, 'HS lậu');
    raise exception 'RLS_TEST_FAIL: org B ghi được học sinh vào org A';
  exception when insufficient_privilege or check_violation then passed := passed + 1; end;
  begin
    insert into public.enrollments (org_id, student_id, class_id) values (org_b, s1, c1);
    raise exception 'RLS_TEST_FAIL: org B tạo được ghi danh trỏ sang dữ liệu org A';
  exception when foreign_key_violation or insufficient_privilege or check_violation then passed := passed + 1; end;
  execute 'reset role';

  -- 3. giáo viên org A: chỉ lớp của mình, không thấy tài chính/cài đặt, không tự nâng quyền
  execute format(as_user, u_t);
  select count(*) into n from public.classes;      if n <> 1 then raise exception 'RLS_TEST_FAIL: GV thấy % lớp (cần 1)', n; end if; passed := passed + 1;
  select count(*) into n from public.enrollments;  if n <> 1 then raise exception 'RLS_TEST_FAIL: GV thấy % ghi danh (cần 1)', n; end if; passed := passed + 1;
  select count(*) into n from public.exams;        if n <> 1 then raise exception 'RLS_TEST_FAIL: GV thấy % bài KT (cần 1)', n; end if; passed := passed + 1;
  select count(*) into n from public.submissions;  if n <> 1 then raise exception 'RLS_TEST_FAIL: GV thấy % bài làm (cần 1)', n; end if; passed := passed + 1;
  select count(*) into n from public.students;     if n <> 2 then raise exception 'RLS_TEST_FAIL: GV thấy % học sinh (cần 2: cả org)', n; end if; passed := passed + 1;
  select count(*) into n from public.payments;     if n <> 0 then raise exception 'RLS_TEST_FAIL: GV thấy học phí'; end if; passed := passed + 1;
  select count(*) into n from public.org_settings; if n <> 0 then raise exception 'RLS_TEST_FAIL: GV thấy cài đặt thanh toán'; end if; passed := passed + 1;
  begin
    update public.profiles set role = 'owner' where id = u_t;
    raise exception 'RLS_TEST_FAIL: GV tự nâng quyền được';
  exception when insufficient_privilege then passed := passed + 1; end;
  begin
    insert into public.exams (org_id, class_id, name, date) values (org_a, c2, 'KT lậu', current_date);
    raise exception 'RLS_TEST_FAIL: GV tạo được bài KT ở lớp không phải của mình';
  exception when insufficient_privilege or check_violation then passed := passed + 1; end;
  execute 'reset role';

  -- 4. owner org A thấy đủ
  execute format(as_user, u_a);
  select count(*) into n from public.classes;      if n <> 2 then raise exception 'RLS_TEST_FAIL: owner thấy % lớp (cần 2)', n; end if; passed := passed + 1;
  select count(*) into n from public.payments;     if n <> 1 then raise exception 'RLS_TEST_FAIL: owner thấy % học phí (cần 1)', n; end if; passed := passed + 1;
  select count(*) into n from public.org_settings; if n <> 1 then raise exception 'RLS_TEST_FAIL: owner không thấy cài đặt'; end if; passed := passed + 1;
  execute 'reset role';

  -- 5. anon không đọc được gì
  execute 'set local role anon';
  begin
    select count(*) into n from public.students;
    if n <> 0 then raise exception 'RLS_TEST_FAIL: anon thấy học sinh'; end if;
  exception when insufficient_privilege then null; end;
  passed := passed + 1;
  execute 'reset role';

  -- 6. giáo viên không xóa được lớp (xóa lớp kéo theo xóa học phí) và không đổi được học phí
  execute format(as_user, u_t);
  delete from public.classes where id = c1; get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS_TEST_FAIL: GV xóa được lớp'; end if; passed := passed + 1;
  begin
    update public.classes set fee = 1 where id = c1;
    raise exception 'RLS_TEST_FAIL: GV đổi được học phí';
  exception when raise_exception then
    if sqlerrm like 'RLS_TEST_FAIL%' then raise; end if; passed := passed + 1;
  end;
  update public.classes set name = 'Lớp đổi tên' where id = c1; get diagnostics n = row_count;
  if n <> 1 then raise exception 'RLS_TEST_FAIL: GV không sửa được lớp của mình'; end if; passed := passed + 1;
  execute 'reset role';

  -- 7. Storage: GV chỉ thấy ảnh của bài thuộc lớp mình, admin thấy cả org, org khác không thấy gì
  insert into storage.objects (bucket_id, name) values
    ('submissions', org_a || '/' || e1 || '/' || s1 || '/a.png'),
    ('submissions', org_a || '/' || e2 || '/' || s2 || '/b.png');
  execute format(as_user, u_t);
  select count(*) into n from storage.objects where bucket_id = 'submissions'; if n <> 1 then raise exception 'RLS_TEST_FAIL: GV thấy % ảnh (cần 1)', n; end if; passed := passed + 1;
  execute 'reset role'; execute format(as_user, u_a);
  select count(*) into n from storage.objects where bucket_id = 'submissions'; if n <> 2 then raise exception 'RLS_TEST_FAIL: owner thấy % ảnh (cần 2)', n; end if; passed := passed + 1;
  execute 'reset role'; execute format(as_user, u_b);
  select count(*) into n from storage.objects where bucket_id = 'submissions'; if n <> 0 then raise exception 'RLS_TEST_FAIL: org B thấy ảnh của org A'; end if; passed := passed + 1;
  execute 'reset role';

  -- 8. save_scores: xóa cả điểm lẫn nhận xét thì phải xóa nhận xét, nhưng giữ bản ghi có ảnh
  update public.submissions set comment = 'nhận xét cũ' where id = sb1;
  insert into public.submission_images (org_id, submission_id, storage_path) values (org_a, sb1, org_a || '/' || e1 || '/' || s1 || '/a.png');
  execute format(as_user, u_a);
  perform public.save_scores(e1, jsonb_build_array(jsonb_build_object('student_id', s1, 'score', null, 'comment', '')));
  execute 'reset role';
  select count(*) into n from public.submissions where id = sb1 and score is null and comment = '' and status = 'uploaded';
  if n <> 1 then raise exception 'RLS_TEST_FAIL: save_scores để lại nhận xét/điểm cũ hoặc xóa bài có ảnh'; end if; passed := passed + 1;

  -- 9. save_attendance + attendance_by_student; GV không điểm danh được lớp của người khác
  execute format(as_user, u_t);
  perform public.save_attendance(c1, current_date, jsonb_build_array(jsonb_build_object('student_id', s1, 'status', 'absent')));
  select absent into n from public.attendance_by_student(c1) where student_id = s1;
  if n is distinct from 1 then raise exception 'RLS_TEST_FAIL: attendance_by_student trả % (cần 1)', n; end if; passed := passed + 1;
  begin
    perform public.save_attendance(c2, current_date, '[]'::jsonb);
    raise exception 'RLS_TEST_FAIL: GV điểm danh được lớp của người khác';
  exception when raise_exception then
    if sqlerrm like 'RLS_TEST_FAIL%' then raise; end if; passed := passed + 1;
  end;
  execute 'reset role';

  -- 10. owner không đổi được loại tổ chức
  execute format(as_user, u_a);
  begin
    update public.orgs set type = 'solo' where id = org_a;
    raise exception 'RLS_TEST_FAIL: owner đổi được loại tổ chức';
  exception when insufficient_privilege then passed := passed + 1; end;
  execute 'reset role';

  raise exception 'RLS_TEST_OK % kiểm tra đạt', passed;
end $$;
