'use client'
import { useCallback, useEffect, useState } from 'react'

/** Ô nhập mã xác nhận 6 số (tự gợi ý mã từ email/SMS trên điện thoại) */
export function OtpField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="Mã xác nhận 6 số" placeholder="••••••"
      value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      className="w-full border rounded px-3 py-2.5 text-center text-2xl tracking-[0.5em] font-mono" />
  )
}

/** Đếm ngược để chặn bấm "Gửi lại mã" liên tục */
export function useCooldown(seconds = 60): [number, () => void] {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  const start = useCallback(() => setLeft(seconds), [seconds])
  return [left, start]
}

/** Đổi thông báo lỗi của Supabase Auth sang tiếng Việt dễ hiểu */
export function authMessage(e: { message: string; code?: string }): string {
  const m = `${e.code ?? ''} ${e.message}`.toLowerCase()
  if (m.includes('rate limit') || m.includes('over_email_send_rate_limit') || m.includes('over_request_rate_limit') || m.includes('security purposes')) return 'Bạn thao tác quá nhanh, hãy thử lại sau ít phút.'
  if (m.includes('expired') || m.includes('invalid') || m.includes('otp')) return 'Mã không đúng hoặc đã hết hạn.'
  if (m.includes('same_password') || m.includes('different from the old')) return 'Mật khẩu mới phải khác mật khẩu cũ.'
  if (m.includes('weak_password') || m.includes('password should')) return 'Mật khẩu quá yếu, hãy dùng ít nhất 8 ký tự.'
  if (m.includes('email_not_confirmed')) return 'Email chưa được xác nhận.'
  return e.message
}
