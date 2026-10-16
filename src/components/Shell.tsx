'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useMe } from '@/lib/me'
import { createClient } from '@/lib/supabase/client'
import { Icon, Modal } from './ui'
import { UserMenu } from './UserMenu'

type Item = { href: string; label: string; icon: string }

export function Shell({ children }: { children: ReactNode }) {
  const me = useMe()
  const path = usePathname()
  const router = useRouter()
  const qc = useQueryClient()
  const [more, setMore] = useState(false)

  const menu: Item[] = [
    { href: '/dashboard', label: 'Tổng quan', icon: 'dashboard' },
    { href: '/students', label: 'Học sinh', icon: 'cap' },
    { href: '/classes', label: 'Lớp học', icon: 'book' },
    ...(me.isCenter && me.isAdmin ? [{ href: '/teachers', label: 'Giáo viên', icon: 'users' }, { href: '/subjects', label: 'Môn học', icon: 'tag' }] : []),
    { href: '/attendance', label: 'Điểm danh', icon: 'check' },
    { href: '/exams', label: 'Bài kiểm tra', icon: 'file' },
    { href: '/grades', label: 'Điểm số', icon: 'clip' },
    ...(me.isAdmin ? [{ href: '/fees', label: 'Học phí', icon: 'wallet' }] : []),
  ]
  // Thanh dưới trên điện thoại: 4 mục dùng nhiều nhất + "Thêm" chứa phần còn lại (không cuộn ngang)
  const primaryHrefs = ['/dashboard', '/attendance', '/exams', me.isAdmin ? '/fees' : '/grades']
  const primary = primaryHrefs.map((h) => menu.find((m) => m.href === h)!).filter(Boolean)
  const rest = menu.filter((m) => !primaryHrefs.includes(m.href))
  const isActive = (href: string) => path.startsWith(href)
  const roleLabel = me.role === 'owner' ? (me.isCenter ? 'Chủ trung tâm' : 'Giáo viên') : me.role === 'admin' ? 'Quản trị viên' : 'Giáo viên'

  const logout = async () => {
    await createClient().auth.signOut()
    qc.clear()
    router.replace('/login')
    router.refresh()
  }

  return (
    <>
      <header className="hdr no-print sticky top-0 z-30 h-12 px-3 flex items-center gap-2">
        <Link href="/dashboard" className="flex items-center gap-2 mr-auto min-w-0">
          <span className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0"><Icon name="cap" className="w-4 h-4" /></span>
          <span className="font-bold text-base">EduManager</span>
          <span className="text-xs text-slate-400 hidden sm:inline truncate">· {me.orgName}</span>
        </Link>
        <UserMenu name={me.fullName} email={me.email} roleLabel={roleLabel} onLogout={logout} />
      </header>

      <div className="md:flex">
        {/* Menu trái (desktop): cố định, không cuộn theo nội dung */}
        <nav className="no-print hidden md:flex md:flex-col md:gap-1 md:sticky md:top-12 md:h-[calc(100vh-3rem)] md:w-56 md:shrink-0 md:overflow-hidden bg-white border-r p-3">
          {menu.map((m) => (
            <Link key={m.href} href={m.href} className={`nav-item flex items-center gap-2.5 px-3 py-2 whitespace-nowrap text-[13px] ${isActive(m.href) ? 'on' : ''}`}>
              <Icon name={m.icon} className="w-[18px] h-[18px]" />{m.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-3 md:p-5 pb-24 md:pb-5 max-w-6xl min-w-0">{children}</main>
      </div>

      {/* Thanh dưới (điện thoại) */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t grid grid-cols-5">
        {primary.map((m) => (
          <Link key={m.href} href={m.href} className={`nav-item flex flex-col items-center gap-1 px-1 py-2 text-[11px] ${isActive(m.href) ? 'on' : ''}`}>
            <Icon name={m.icon} className="w-5 h-5" />{m.label}
          </Link>
        ))}
        <button type="button" onClick={() => setMore(true)} className={`nav-item flex flex-col items-center gap-1 px-1 py-2 text-[11px] ${rest.some((m) => isActive(m.href)) ? 'on' : ''}`}>
          <Icon name="more" className="w-5 h-5" />Thêm
        </button>
      </nav>
      <Modal open={more} onClose={() => setMore(false)} maxW="md:max-w-sm">
        <h2 className="font-bold text-base mb-3">Menu</h2>
        <div className="grid grid-cols-3 gap-2">
          {rest.map((m) => (
            <Link key={m.href} href={m.href} onClick={() => setMore(false)}
              className={`flex flex-col items-center gap-1.5 rounded-lg border py-3 text-xs hover:bg-slate-50 ${isActive(m.href) ? 'border-indigo-600 text-indigo-700' : ''}`}>
              <Icon name={m.icon} className="w-5 h-5" />{m.label}
            </Link>
          ))}
        </div>
      </Modal>
    </>
  )
}
