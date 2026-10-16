'use client'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { OtpField, authMessage, useCooldown } from '@/components/auth'
import { createClient } from '@/lib/supabase/client'

export type TestAccount = { label: string; note: string; email: string; password: string }

export function LoginForm({ testAccounts }: { testAccounts?: TestAccount[] }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState<string | null>(null) // != null: tài khoản chưa xác nhận email, đang nhập mã
  const [cooldown, startCooldown] = useCooldown(60)

  const enter = () => {
    qc.clear() // bỏ cache của người dùng trước, tránh hiện nhầm danh tính
    router.replace('/dashboard')
    router.refresh()
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: code ?? '', type: 'signup' })
    if (error) { setBusy(false); return setErr(authMessage(error)) }
    enter()
  }

  const resend = async () => {
    setErr('')
    const { error } = await createClient().auth.resend({ type: 'signup', email: email.trim() })
    if (error) return setErr(authMessage(error))
    startCooldown(); setCode('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      if (error.code === 'email_not_confirmed') { // đã đăng ký nhưng chưa nhập mã: gửi lại mã và chuyển sang bước nhập mã
        const r = await createClient().auth.resend({ type: 'signup', email: email.trim() })
        setBusy(false)
        const tooSoon = r.error && /rate|security|seconds/i.test(`${r.error.code} ${r.error.message}`) // vừa gửi mã cách đây chưa tới 1 phút: dùng mã đó
        if (r.error && !tooSoon) return setErr(authMessage(r.error))
        setCode(''); startCooldown(); return
      }
      setBusy(false); return setErr('Email hoặc mật khẩu không đúng')
    }
    enter()
  }

  if (code !== null) {
    return (
      <form onSubmit={verify}>
        <h1 className="page-title mb-1">Xác nhận email</h1>
        <p className="text-sm text-slate-500 mb-4">Tài khoản <b>{email.trim()}</b> chưa được xác nhận. Chúng tôi vừa gửi mã 6 số tới email này, hãy kiểm tra cả thư mục <b>Spam</b>.</p>
        <OtpField value={code} onChange={setCode} />
        {err && <p className="text-rose-600 text-sm mt-2">{err}</p>}
        <button disabled={busy || code.length !== 6} className="w-full bg-indigo-600 text-white rounded py-2 mt-3 disabled:opacity-50">{busy ? 'Đang xác nhận…' : 'Xác nhận và đăng nhập'}</button>
        <div className="flex justify-between text-xs mt-3">
          <button type="button" className="text-slate-500 underline" onClick={() => { setCode(null); setErr('') }}>Quay lại</button>
          <button type="button" disabled={cooldown > 0} className="text-indigo-600 disabled:text-slate-400" onClick={resend}>{cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã'}</button>
        </div>
      </form>
    )
  }

  return (
    <>
      <form onSubmit={submit}>
        <h1 className="page-title mb-4">Đăng nhập</h1>
        <label className="block mb-2"><span className="text-xs text-slate-500">Email</span>
          <input type="email" required autoComplete="email" className="w-full border rounded px-2 py-1.5" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="block mb-1"><span className="text-xs text-slate-500">Mật khẩu</span>
          <input type="password" required autoComplete="current-password" className="w-full border rounded px-2 py-1.5" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <div className="text-right mb-3"><Link href="/forgot-password" className="text-xs text-indigo-600 hover:underline">Quên mật khẩu?</Link></div>
        {err && <p className="text-rose-600 text-sm mb-2">{err}</p>}
        <button disabled={busy} className="w-full bg-indigo-600 text-white rounded py-2 disabled:opacity-50">{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
        <p className="text-xs text-slate-500 mt-4 text-center">Chưa có tài khoản? <Link href="/register" className="text-indigo-600 underline">Đăng ký trung tâm / giáo viên</Link></p>
        <p className="text-xs text-slate-400 mt-2 text-center">Giáo viên của trung tâm: nhờ quản trị viên cấp tài khoản.</p>
      </form>

      {testAccounts && (
        <div className="mt-5 pt-4 border-t">
          <div className="text-xs font-semibold text-amber-700 mb-2">Tài khoản thử (chỉ hiện khi chạy local) · bấm để điền sẵn</div>
          <div className="space-y-1.5">
            {testAccounts.map((a) => (
              <button key={a.email} type="button" onClick={() => { setEmail(a.email); setPassword(a.password); setErr('') }}
                className={`w-full text-left border rounded px-2.5 py-1.5 hover:bg-slate-50 ${email === a.email ? 'border-indigo-600 ring-2 ring-indigo-200' : ''}`}>
                <div className="flex items-baseline justify-between gap-2"><span className="font-medium text-sm">{a.label}</span><span className="text-[11px] text-slate-400">{a.note}</span></div>
                <div className="text-xs font-mono text-slate-600 break-all">{a.email}</div>
                <div className="text-xs font-mono text-slate-500 break-all">mật khẩu: {a.password}</div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Chưa có các tài khoản này? Chạy <code>node --env-file=.env scripts/seed-test.mjs</code>.</p>
        </div>
      )}
    </>
  )
}
