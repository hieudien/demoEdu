'use client'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { OtpField, authMessage, useCooldown } from '@/components/auth'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [verified, setVerified] = useState(false) // mã đã đúng nhưng đặt mật khẩu lỗi thì thử lại không cần mã mới
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, startCooldown] = useCooldown(60)

  const sendCode = async () => {
    // luôn báo thành công dù email có tồn tại hay không (không để lộ email nào đã đăng ký)
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim())
    if (error && /rate|security|too many/i.test(error.message)) throw error
    startCooldown()
  }

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await sendCode(); setStep('reset') } catch (e2) { setErr(authMessage(e2 as Error)) }
    setBusy(false)
  }

  const resend = async () => {
    setErr('')
    try { await sendCode(); setCode(''); setVerified(false) } catch (e2) { setErr(authMessage(e2 as Error)) }
  }

  const reset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verified && code.length !== 6) return setErr('Nhập đủ 6 số của mã xác nhận')
    if (pw.length < 8) return setErr('Mật khẩu mới tối thiểu 8 ký tự')
    if (pw !== pw2) return setErr('Mật khẩu nhập lại không khớp')
    setBusy(true); setErr('')
    const sb = createClient()
    if (!verified) {
      const v = await sb.auth.verifyOtp({ email: email.trim(), token: code, type: 'recovery' })
      if (v.error) { setBusy(false); return setErr(authMessage(v.error)) }
      setVerified(true)
    }
    const up = await sb.auth.updateUser({ password: pw })
    if (up.error) { setBusy(false); return setErr(authMessage(up.error)) }
    await sb.auth.signOut({ scope: 'others' }) // đăng xuất mọi thiết bị khác sau khi đặt lại mật khẩu
    qc.clear()
    router.replace('/dashboard')
    router.refresh()
  }

  if (step === 'reset') {
    return (
      <form onSubmit={reset}>
        <h1 className="page-title mb-1">Đặt mật khẩu mới</h1>
        <p className="text-sm text-slate-500 mb-4">Nếu <b>{email.trim()}</b> có tài khoản, chúng tôi đã gửi mã 6 số tới đó. Hãy kiểm tra cả thư mục <b>Spam</b>.</p>
        {!verified && <div className="mb-3"><OtpField value={code} onChange={setCode} /></div>}
        <label className="block mb-2"><span className="text-xs text-slate-500">Mật khẩu mới (tối thiểu 8 ký tự)</span>
          <input type="password" required autoComplete="new-password" className="w-full border rounded px-2 py-1.5" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        <label className="block mb-3"><span className="text-xs text-slate-500">Nhập lại mật khẩu mới</span>
          <input type="password" required autoComplete="new-password" className="w-full border rounded px-2 py-1.5" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
        {err && <p className="text-rose-600 text-sm mb-2">{err}</p>}
        <button disabled={busy} className="w-full bg-indigo-600 text-white rounded py-2 disabled:opacity-50">{busy ? 'Đang đặt lại…' : 'Đặt lại mật khẩu'}</button>
        <div className="flex justify-between text-xs mt-3">
          <button type="button" className="text-slate-500 underline" onClick={() => { setStep('email'); setErr(''); setCode(''); setVerified(false) }}>Đổi email</button>
          <button type="button" disabled={cooldown > 0} className="text-indigo-600 disabled:text-slate-400" onClick={resend}>{cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã'}</button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={requestCode}>
      <h1 className="page-title mb-1">Quên mật khẩu</h1>
      <p className="text-sm text-slate-500 mb-4">Nhập email đăng nhập, chúng tôi sẽ gửi mã xác nhận 6 số để bạn đặt mật khẩu mới.</p>
      <label className="block mb-3"><span className="text-xs text-slate-500">Email</span>
        <input type="email" required autoFocus autoComplete="email" className="w-full border rounded px-2 py-1.5" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      {err && <p className="text-rose-600 text-sm mb-2">{err}</p>}
      <button disabled={busy} className="w-full bg-indigo-600 text-white rounded py-2 disabled:opacity-50">{busy ? 'Đang gửi mã…' : 'Gửi mã xác nhận'}</button>
      <p className="text-xs text-slate-500 mt-4 text-center"><Link href="/login" className="text-indigo-600 underline">← Quay lại đăng nhập</Link></p>
    </form>
  )
}
