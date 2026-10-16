'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { initial } from '@/lib/utils'
import { Icon } from './ui'

/** Menu avatar: di chuột (desktop) hoặc chạm (điện thoại) để mở; tự đóng khi bấm ra ngoài / Esc. */
export function UserMenu({ name, email, roleLabel, onLogout }: { name: string; email: string; roleLabel: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = useCallback(() => { clearTimeout(timer.current); setOpen(true) }, [])
  const hideSoon = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 180) }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent | TouchEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc); document.addEventListener('touchstart', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('touchstart', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const item = 'flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm rounded-md hover:bg-slate-100'

  return (
    <div ref={root} className="relative" onMouseEnter={show} onMouseLeave={hideSoon}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-slate-100">
        <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm">{initial(name || email)}</span>
        <span className="hidden sm:block text-left leading-tight">
          <span className="block text-xs font-medium max-w-32 truncate">{name || email}</span>
          <span className="block text-[11px] text-slate-400">{roleLabel}</span>
        </span>
        <Icon name="chevron" className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full pt-1 z-50 w-64">
          <div className="bg-white border rounded-lg shadow-lg p-1.5">
            <div className="px-3 py-2.5 border-b mb-1">
              <div className="font-semibold truncate">{name || 'Tài khoản'}</div>
              <div className="text-xs text-slate-500 truncate">{email}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{roleLabel}</div>
            </div>
            <Link role="menuitem" href="/profile" className={item} onClick={() => setOpen(false)}><Icon name="user" className="w-4 h-4 text-slate-500" />Hồ sơ cá nhân</Link>
            <Link role="menuitem" href="/profile#password" className={item} onClick={() => setOpen(false)}><Icon name="lock" className="w-4 h-4 text-slate-500" />Đổi mật khẩu</Link>
            <div className="border-t my-1" />
            <button role="menuitem" type="button" className={`${item} text-rose-600 hover:bg-rose-50`} onClick={onLogout}><Icon name="logout" className="w-4 h-4" />Đăng xuất</button>
          </div>
        </div>
      )}
    </div>
  )
}
