# EduManager

Web quản lý trung tâm dạy thêm / giáo viên cá nhân: giáo viên, môn, lớp, học sinh, điểm danh, bài kiểm tra (ảnh bài làm, AI chấm, gửi Zalo), điểm số, học phí (mã QR chuyển khoản).

Next.js 16 (App Router) + Tailwind v4 + Supabase (Postgres, Auth, Storage) + TanStack Query.

## Chạy local

```bash
npm install
cp .env.example .env   # điền khóa Supabase
npm run dev
```

Biến môi trường (`.env`, không commit):

| Biến | Dùng ở | Ghi chú |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | trình duyệt + server | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | trình duyệt + server | khóa công khai, mọi truy cập đi qua RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **chỉ server** | tạo/xóa tài khoản giáo viên; bỏ qua RLS nên chỉ dùng sau khi kiểm tra quyền |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` | CLI | chỉ để chạy `supabase db push` |

## Cơ sở dữ liệu

Migration nằm trong `supabase/migrations/` (đẩy lên bằng `npx supabase db push`):

1. `…001_schema`: bảng, khóa ngoại `(id, org_id)` chống trỏ chéo giữa các tổ chức
2. `…002_rls`: RLS, hàm kiểm tra vai trò, bucket ảnh `submissions` (private), hàm `create_org`
3. `…003_unique_per_org`: ràng buộc duy nhất kèm `org_id`
4. `…004_rpc`: `save_attendance`, `save_scores`
5. `…005_zalo_template_on_orgs`

Kiểm tra phân quyền (chạy lại được, tự rollback): `supabase/tests/rls_test.sql`.
Sinh kiểu TypeScript: `npx supabase gen types typescript --project-id $SUPABASE_PROJECT_REF --schema public > src/lib/database.types.ts`.

## Email (đăng ký, quên mật khẩu)

Email do Supabase Auth gửi, qua SMTP Gmail của bạn. Thư chứa **mã xác nhận 6 số** (không có link), nên không phụ thuộc địa chỉ web của trang.
Cấu hình (SMTP, mẫu thư tiếng Việt, bật xác nhận email, giới hạn 30 thư/giờ):

```bash
set -a; . ./.env; set +a
python scripts/configure-auth-email.py
```

Giới hạn của Gmail: khoảng 500 người nhận/ngày, thư dễ vào Spam, người gửi hiển thị là địa chỉ Gmail. Khi có tên miền riêng nên đổi sang Resend hoặc Brevo (chỉ đổi cấu hình SMTP).
Đăng ký bằng email: nhập thông tin rồi nhập mã gửi về email; tài khoản chưa xác nhận đăng nhập sẽ được gửi lại mã.

## Dữ liệu thử (chỉ cho môi trường dev)

```bash
node --env-file=.env scripts/seed-test.mjs
```

Tạo (hoặc làm mới) 3 tài khoản thử và dữ liệu mẫu: `center.test@example.com` (chủ trung tâm), `gv.test@example.com` (giáo viên của trung tâm đó), `solo.test@example.com` (giáo viên cá nhân). Mật khẩu chung là `TEST_PASSWORD` trong `.env` (tự sinh ở lần chạy đầu). Chạy lại sẽ xóa dữ liệu thử cũ rồi tạo mới.

Trang đăng nhập tự hiện 3 tài khoản thử (kèm mật khẩu, bấm để điền sẵn) khi chạy `npm run dev` trên `localhost`. Với `npm start` cục bộ thì thêm `SHOW_TEST_LOGINS=1` vào `.env`. Trên máy chủ thật (host khác hoặc `NODE_ENV=production`) danh sách này không bao giờ được gửi xuống trình duyệt.

## Vai trò

- **Chủ trung tâm / quản trị**: toàn quyền trong tổ chức; tạo tài khoản giáo viên (không gửi email, tự đặt mật khẩu).
- **Giáo viên**: chỉ thấy lớp mình dạy và bài làm, điểm danh, điểm số của lớp đó; không thấy học phí.
- **Giáo viên cá nhân**: tổ chức một người, vừa là chủ vừa là giáo viên.

Đăng ký tại `/register` (tạo trung tâm hoặc giáo viên cá nhân). Giáo viên của trung tâm do quản trị cấp tài khoản.

## Chưa làm

- Gọi AI thật để chấm bài (hiện giả lập, kết quả vẫn lưu vào DB).
- Gửi Zalo thật qua Zalo OA (hiện chỉ ghi lịch sử).
- Webhook ngân hàng tự đối soát học phí (bảng `bank_transactions` đã có).
