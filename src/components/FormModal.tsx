'use client'
import { useState } from 'react'
import { useCalendarActions } from '@/lib/data/calendar'
import { useCoreActions, useCoreQ } from '@/lib/data/core'
import { hm } from '@/lib/data/types'
import { useMe } from '@/lib/me'
import { iso } from '@/lib/utils'
import { useToast } from './Providers'
import { Modal } from './ui'

export type FormTable = 'students' | 'classes' | 'subjects' | 'exams' | 'events'
type Field = {
  k: string; label: string; type?: string
  opts?: 'subjects' | 'teachers' | 'classes'; list?: { id: string; name: string }[]
  only?: 'center' | 'admin'
}

const TITLES: Record<FormTable, string> = { students: 'học sinh', classes: 'lớp học', subjects: 'môn học', exams: 'bài kiểm tra', events: 'sự kiện lịch' }
const FORMS: Record<FormTable, Field[]> = {
  events: [
    { k: 'class_id', label: 'Lớp', type: 'select', opts: 'classes' },
    { k: 'type', label: 'Loại', type: 'select', list: [{ id: 'makeup', name: 'Học bù' }, { id: 'exam', name: 'Kiểm tra' }, { id: 'off', name: 'Nghỉ' }] },
    { k: 'date', label: 'Ngày', type: 'date' }, { k: 'time_start', label: 'Giờ bắt đầu (bỏ trống = giờ của lớp)', type: 'time' }, { k: 'note', label: 'Ghi chú' },
  ],
  exams: [
    { k: 'name', label: 'Tên bài kiểm tra' }, { k: 'date', label: 'Ngày', type: 'date' }, { k: 'max_score', label: 'Thang điểm tối đa', type: 'number' },
    { k: 'brief', label: 'Đề bài / đáp án (để AI đối chiếu, tùy chọn)', type: 'textarea' },
  ],
  students: [
    { k: 'name', label: 'Họ tên' }, { k: 'dob', label: 'Ngày sinh', type: 'date' },
    { k: 'parent_name', label: 'Phụ huynh' }, { k: 'parent_phone', label: 'SĐT phụ huynh', type: 'tel' },
  ],
  subjects: [{ k: 'name', label: 'Tên môn' }],
  classes: [
    { k: 'name', label: 'Tên lớp' },
    { k: 'subject_id', label: 'Môn', type: 'select', opts: 'subjects', only: 'center' },
    { k: 'teacher_id', label: 'Giáo viên', type: 'select', opts: 'teachers', only: 'admin' },
    { k: 'days', label: 'Ngày học', type: 'days' },
    { k: 'time_start', label: 'Giờ bắt đầu', type: 'time' }, { k: 'time_end', label: 'Giờ kết thúc', type: 'time' },
    { k: 'room', label: 'Phòng / địa điểm' }, { k: 'fee', label: 'Học phí / tháng (đ)', type: 'number' },
  ],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = Record<string, any>

export function FormModal({ table, item, defaults, onClose, onSaved }: {
  table: FormTable; item?: Item; defaults?: Item; onClose: () => void; onSaved?: (id: string) => void
}) {
  const me = useMe()
  const toast = useToast()
  const { core } = useCoreQ()
  const { save } = useCoreActions()
  const cal = useCalendarActions()
  const [busy, setBusy] = useState(false)

  const base: Record<FormTable, Item> = {
    events: { class_id: core.classes[0]?.id ?? '', type: 'makeup', date: iso(new Date()), time_start: '', note: '' },
    exams: { name: '', date: iso(new Date()), max_score: 10, brief: '' },
    students: { name: '', dob: '', parent_name: '', parent_phone: '' },
    subjects: { name: '' },
    classes: {
      name: '', subject_id: me.isCenter ? core.subjects[0]?.id ?? null : null,
      teacher_id: me.isAdmin && me.isCenter ? core.teachers[0]?.id ?? null : me.teacherId,
      days: [] as number[], time_start: '18:00', time_end: '19:30', room: '', fee: 500000,
    },
  }
  const [v, setV] = useState<Item>(() => {
    if (!item) return { ...base[table], ...defaults }
    const o = { ...item }
    if (table === 'classes') { o.time_start = hm(o.time_start); o.time_end = hm(o.time_end) }
    if (table === 'events') o.time_start = hm(o.time_start)
    return o
  })
  const show = (f: Field) => !f.only || (f.only === 'center' && me.isCenter) || (f.only === 'admin' && me.isCenter && me.isAdmin)
  const set = (k: string, val: unknown) => setV((p) => ({ ...p, [k]: val }))

  const submit = async () => {
    const o = { ...v }
    if (table !== 'events' && !String(o.name ?? '').trim()) return toast('Vui lòng nhập tên')
    if (table === 'events' && (!o.date || !o.class_id)) return toast('Chọn lớp và ngày')
    if (table === 'classes') {
      o.fee = Math.max(0, +o.fee || 0)
      o.days = [...o.days].sort((a: number, b: number) => ((a + 6) % 7) - ((b + 6) % 7)) // T2 → CN
      if (!o.days.length) return toast('Chọn ít nhất 1 ngày học')
      if (!o.time_start || !o.time_end || o.time_end <= o.time_start) return toast('Giờ kết thúc phải sau giờ bắt đầu')
      o.subject_id = o.subject_id || null; o.teacher_id = o.teacher_id || null
    }
    if (table === 'students') o.dob = o.dob || null
    if (table === 'exams') o.max_score = +o.max_score > 0 ? +o.max_score : 10
    if (table === 'events') o.time_start = o.time_start || null
    if (typeof o.name === 'string') o.name = o.name.trim()
    setBusy(true)
    const res = table === 'events' ? await cal.saveEvent(o as never) : await save(table, o)
    setBusy(false)
    if (!res.ok) return
    onSaved?.((res.data as { id?: string } | null)?.id ?? '')
    onClose()
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="font-bold text-base mb-3">{item ? 'Sửa ' : 'Thêm '}{TITLES[table]}</h2>
      {FORMS[table].filter(show).map((f) => (
        <label key={f.k} className="block mb-2">
          <span className="text-xs text-slate-500">{f.label}</span>
          {f.type === 'select' ? (
            <select className="w-full border rounded px-2 py-1.5 bg-white" value={v[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)}>
              {f.opts === 'subjects' && <option value="">— Không chọn —</option>}
              {(f.list ?? core[f.opts!]).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          ) : f.type === 'days' ? (
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button key={d} type="button" className={`w-9 py-1 rounded border text-xs ${v.days.includes(d) ? 'bg-indigo-600 text-white border-indigo-600' : ''}`}
                  onClick={() => setV((p) => ({ ...p, days: p.days.includes(d) ? p.days.filter((x: number) => x !== d) : [...p.days, d] }))}>{d ? 'T' + (d + 1) : 'CN'}</button>
              ))}
            </div>
          ) : f.type === 'textarea' ? (
            <textarea className="w-full border rounded px-2 py-1.5" rows={3} value={v[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)} />
          ) : (
            <input className="w-full border rounded px-2 py-1.5 disabled:bg-slate-50 disabled:text-slate-400" type={f.type || 'text'} value={v[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)}
              disabled={table === 'classes' && f.k === 'fee' && !!item && !me.isAdmin} title={table === 'classes' && f.k === 'fee' && !!item && !me.isAdmin ? 'Chỉ quản trị viên được đổi học phí' : undefined} />
          )}
        </label>
      ))}
      <div className="flex justify-end gap-2 mt-4">
        <button className="px-3 py-1.5 rounded border" onClick={onClose}>Hủy</button>
        <button disabled={busy} className="px-4 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50" onClick={submit}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </Modal>
  )
}
