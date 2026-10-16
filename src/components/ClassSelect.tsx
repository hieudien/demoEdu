'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Cls } from '@/lib/data/types'
import { Icon } from './ui'

const GRID_MAX = 6 // từ 6 lớp trở xuống: hiện thẻ; nhiều hơn: ô chọn có tìm kiếm
const RECENT_KEY = 'edu:recent-classes'

const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] } }
const pushRecent = (id: string) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((x) => x !== id)].slice(0, 5))) } catch { /* bỏ qua */ } }

type Props = {
  classes: Cls[]
  value: string                       // '' = chưa chọn (hoặc "tất cả" khi allowAll)
  onChange: (id: string) => void
  sub: (c: Cls) => string             // dòng phụ dưới tên lớp
  dot: (c: Cls) => string             // class màu chấm của lớp
  teacherOf?: (c: Cls) => string      // có thì cho lọc theo giáo viên
  allowAll?: boolean                  // thêm lựa chọn "Tất cả lớp" (dùng cho bộ lọc)
  allLabel?: string
  placeholder?: string
  flush?: boolean                     // bỏ khoảng cách dưới (khi đặt trong hàng bộ lọc)
}

/** Chọn lớp: ít lớp thì hiện thẻ, nhiều lớp thì ô tìm kiếm (nhóm "Hôm nay", "Gần đây", lọc giáo viên, điều hướng bàn phím). */
export function ClassSelect(p: Props) {
  if (p.classes.length <= GRID_MAX && !p.allowAll) return <Cards {...p} />
  return <Combo {...p} />
}

function Cards({ classes, value, onChange, sub, dot }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
      {classes.map((c) => (
        <button key={c.id} onClick={() => onChange(c.id)}
          className={`hoverable text-left rounded-lg border bg-white p-3 shadow-sm ${value === c.id ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${dot(c)}`} /><span className="font-semibold">{c.name}</span></div>
          <div className="text-xs text-slate-500 mt-1">{sub(c)}</div>
        </button>
      ))}
    </div>
  )
}

function Combo({ classes, value, onChange, sub, dot, teacherOf, allowAll, allLabel = 'Tất cả lớp', placeholder = 'Chọn lớp…', flush }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [today, setToday] = useState(false)
  const [teacher, setTeacher] = useState('')
  const [hi, setHi] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [recent, setRecent] = useState<string[]>([])

  const dow = new Date().getDay()
  const selected = classes.find((c) => c.id === value)
  const teachers = useMemo(() => (teacherOf ? [...new Set(classes.map(teacherOf))].sort((a, b) => a.localeCompare(b, 'vi')) : []), [classes, teacherOf])
  const filtering = !!query.trim() || today || !!teacher

  // Danh sách hiển thị theo thứ tự (cũng là thứ tự điều hướng bàn phím), mỗi mục thuộc một nhóm
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pass = (c: Cls) => (!q || c.name.toLowerCase().includes(q) || c.room.toLowerCase().includes(q) || (teacherOf?.(c) ?? '').toLowerCase().includes(q))
      && (!today || c.days.includes(dow)) && (!teacher || teacherOf?.(c) === teacher)
    const all = classes.filter(pass)
    const out: { c: Cls | null; group: string }[] = []
    if (allowAll) out.push({ c: null, group: '' })
    if (filtering) return [...out, ...all.map((c) => ({ c, group: 'Kết quả' }))]
    const todays = all.filter((c) => c.days.includes(dow))
    const recents = recent.map((id) => all.find((c) => c.id === id)).filter((c): c is Cls => !!c && !todays.includes(c))
    todays.forEach((c) => out.push({ c, group: 'Có lịch hôm nay' }))
    recents.forEach((c) => out.push({ c, group: 'Gần đây' }))
    const shown = new Set(out.map((r) => r.c?.id))
    all.filter((c) => !shown.has(c.id)).forEach((c) => out.push({ c, group: shown.size ? 'Các lớp khác' : 'Tất cả lớp' }))
    return out
  }, [classes, query, today, teacher, filtering, recent, dow, teacherOf, allowAll])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent | TouchEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('touchstart', onDoc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('touchstart', onDoc) }
  }, [open])

  const openIt = () => { setRecent(readRecent()); setQuery(''); setToday(false); setTeacher(''); setHi(0); setOpen(true); setTimeout(() => search.current?.focus(), 0) }
  const pick = (c: Cls | null) => { if (c) pushRecent(c.id); onChange(c?.id ?? ''); setOpen(false) }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(rows.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
    else if (e.key === 'Enter' && rows[hi]) { e.preventDefault(); pick(rows[hi].c) }
  }
  useEffect(() => { document.querySelector(`[data-row="${hi}"]`)?.scrollIntoView({ block: 'nearest' }) }, [hi])

  return (
    <div ref={root} className={`relative max-w-xl ${flush ? '' : 'mb-4'}`} onKeyDown={onKey}>
      <button type="button" onClick={() => (open ? setOpen(false) : openIt())} aria-haspopup="listbox" aria-expanded={open}
        className={`hoverable w-full flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-left shadow-sm ${open ? 'border-indigo-600 ring-2 ring-indigo-200' : selected ? 'border-indigo-300' : 'border-slate-300'}`}>
        {selected ? (
          <>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot(selected)}`} />
            <span className="min-w-0 flex-1"><span className="block font-semibold truncate">{selected.name}</span><span className="block text-xs text-slate-500 truncate">{sub(selected)}</span></span>
            <span className="text-xs text-indigo-700 shrink-0">Đổi lớp</span>
          </>
        ) : (
          <>
            <span className="flex-1 text-slate-500">{allowAll ? allLabel : placeholder} <span className="text-slate-400">({classes.length} lớp)</span></span>
          </>
        )}
        <Icon name="chevron" className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div role="listbox" className="absolute z-40 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b space-y-2">
            <div className="relative">
              <Icon name="search" className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input ref={search} value={query} onChange={(e) => { setQuery(e.target.value); setHi(0) }} placeholder="Tìm theo tên lớp, phòng…" className="w-full border rounded pl-8 pr-2 py-1.5" />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button type="button" onClick={() => { setToday((t) => !t); setHi(0) }} className={`rounded-full border px-2.5 py-1 ${today ? 'bg-indigo-600 text-white border-indigo-600' : ''}`}>Có lịch hôm nay</button>
              {teachers.length > 1 && (
                <select value={teacher} onChange={(e) => { setTeacher(e.target.value); setHi(0) }} className="border rounded-full px-2 py-1 bg-white">
                  <option value="">Mọi giáo viên</option>
                  {teachers.map((t) => <option key={t}>{t}</option>)}
                </select>
              )}
              <span className="ml-auto text-slate-400">{rows.filter((r) => r.c).length}{filtering ? `/${classes.length}` : ''} lớp</span>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {rows.map((r, i) => (
              <div key={(r.c?.id ?? 'all') + r.group}>
                {r.group && rows[i - 1]?.group !== r.group && <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{r.group}</div>}
                <button type="button" role="option" aria-selected={(r.c?.id ?? '') === value} data-row={i} onMouseEnter={() => setHi(i)} onClick={() => pick(r.c)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left ${i === hi ? 'bg-indigo-50' : ''} ${(r.c?.id ?? '') === value ? 'font-semibold' : ''}`}>
                  {r.c ? (
                    <>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot(r.c)}`} />
                      <span className="min-w-0 flex-1"><span className="block truncate">{r.c.name}</span><span className="block text-xs text-slate-500 font-normal truncate">{sub(r.c)}</span></span>
                      {r.c.days.includes(dow) && <span className="text-[10px] text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5 shrink-0">Hôm nay</span>}
                    </>
                  ) : <span className="text-slate-600">{allLabel}</span>}
                </button>
              </div>
            ))}
            {!rows.length && <div className="px-3 py-6 text-center text-slate-400">Không có lớp nào khớp.</div>}
          </div>
        </div>
      )}
    </div>
  )
}
