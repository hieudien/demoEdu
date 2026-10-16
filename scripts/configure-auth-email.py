"""Cấu hình email của Supabase Auth: SMTP Gmail + mẫu thư tiếng Việt gửi MÃ 6 SỐ (không dùng link) + bật xác nhận email.
Chạy: set -a; . ./.env; set +a; python scripts/configure-auth-email.py
Cần trong .env: SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, GMAIL_SMTP_USER, GMAIL_SMTP_APP_PASSWORD (mật khẩu ứng dụng Google).
"""
import json, os, urllib.request

ref = os.environ['SUPABASE_PROJECT_REF']
url = f"https://api.supabase.com/v1/projects/{ref}/config/auth"
H = {"Authorization": "Bearer " + os.environ['SUPABASE_ACCESS_TOKEN'], "Content-Type": "application/json", "User-Agent": "demoEdu"}

def tpl(title, lead, note):
    return f"""<div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827">
  <div style="font-size:18px;font-weight:700;color:#0e7490;margin-bottom:16px">EduManager</div>
  <h2 style="font-size:18px;margin:0 0 8px">{title}</h2>
  <p style="margin:0 0 16px;color:#374151">{lead}</p>
  <div style="font-size:32px;letter-spacing:8px;font-weight:700;background:#ecfeff;border:1px solid #a5f3fc;border-radius:8px;text-align:center;padding:16px;color:#0e7490">{{{{ .Token }}}}</div>
  <p style="margin:16px 0 0;color:#6b7280;font-size:13px">Mã có hiệu lực trong 30 phút. {note}</p>
</div>"""

body = {
    "smtp_host": "smtp.gmail.com", "smtp_port": "465",
    "smtp_user": os.environ['GMAIL_SMTP_USER'], "smtp_pass": os.environ['GMAIL_SMTP_APP_PASSWORD'].replace(' ', ''),
    "smtp_admin_email": os.environ['GMAIL_SMTP_USER'], "smtp_sender_name": "EduManager",
    "smtp_max_frequency": 60, "rate_limit_email_sent": 30,
    "mailer_autoconfirm": False, "mailer_otp_length": 6, "mailer_otp_exp": 1800,
    "mailer_subjects_confirmation": "EduManager: mã xác nhận đăng ký",
    "mailer_templates_confirmation_content": tpl("Xác nhận đăng ký", "Nhập mã dưới đây vào trang đăng ký để hoàn tất tạo tài khoản:", "Nếu bạn không đăng ký EduManager, hãy bỏ qua email này."),
    "mailer_subjects_recovery": "EduManager: mã đặt lại mật khẩu",
    "mailer_templates_recovery_content": tpl("Đặt lại mật khẩu", "Nhập mã dưới đây cùng mật khẩu mới vào trang quên mật khẩu:", "Nếu bạn không yêu cầu, hãy bỏ qua email này, mật khẩu của bạn không thay đổi."),
    "mailer_subjects_email_change": "EduManager: mã xác nhận đổi email",
    "mailer_templates_email_change_content": tpl("Xác nhận đổi email", "Nhập mã dưới đây để xác nhận địa chỉ email mới:", "Nếu bạn không yêu cầu, hãy bỏ qua email này."),
}
req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=H, method="PATCH")
cfg = json.loads(urllib.request.urlopen(req, timeout=60).read().decode())
keys = ['mailer_autoconfirm', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_admin_email', 'smtp_sender_name', 'smtp_max_frequency', 'mailer_otp_length', 'mailer_otp_exp', 'rate_limit_email_sent', 'mailer_subjects_confirmation', 'mailer_subjects_recovery']
print({k: cfg.get(k) for k in keys}, '| pass set:', bool(cfg.get('smtp_pass')))
print('tpl has token:', all('{{ .Token }}' in (cfg.get(k) or '') for k in ['mailer_templates_confirmation_content', 'mailer_templates_recovery_content']))
