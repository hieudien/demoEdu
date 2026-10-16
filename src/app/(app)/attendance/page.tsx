'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'
import { ClassSelect } from '@/components/ClassSelect'
import { Avatar, Empty, Loading, Tabs } from '@/components/ui'
import { attStudentStats, useAttendance, useAttendanceByStudent, useAttendanceHistory, useSaveAttendance } from '@/lib/data/attendance'
import { useCoreQ } from '@/lib/data/core'
import type { Status } from '@/lib/data/types'
import { useMe } from '@/lib/me'
import { useClassParam } from '@/lib/useClassParam'
import { fmtDate, iso, parseDate, shiftDay, wd } from '@/lib/utils'

export default function AttendancePage() {
  return <Suspense><Attendance /></Suspense>
}

const STATUS: [Status, string, string][] = [
  ['present', 'Có mặt', 'bg-emerald-600 text-white border-emerald-600'],
  ['excused', 'Phép', 'bg-amber-500 text-white border-amber-500'],
  ['absent', 'Vắng', 'bg-rose-600 text-white border-rose-600'],
]

function Attendance() {
  const { ready, error, core, q } = useCoreQ()
  const sp = useSearchParams()
  const today = iso(new Date())
  const me = useMe()
  const [cid, setCid] = useClassParam()
  const [date, setDate] = useState(sp.get('date') ?? today)
  const [tab, setTab] = useState<'mark' | 'history'>('mark')
  const save = useSaveAttendance()
  const [saving, setSaving] = useState(false)

  const day = useAttendance(cid, date)
  const history = useAttendanceHistory(tab === 'history' ? cid : '')
  const byStudent = useAttendanceByStudent(tab === 'history' ? cid : '')

  // bản nháp theo (lớp, ngày): đổi lớp/ngày thì tự bỏ nháp
  const key = cid + '|' + date
  const [draft, setDraft] = useState<{ key: string; map: Record<string, Status> }>({ key: '', map: {} })
  const students = useMemo(() => (ready && cid ? q.enrolled(cid) : []), [ready, q, cid])
  const att = useMemo(() => {
    const m: Record<string, Status> = {}
    students.forEach((s) => { m[s.id] = day.data?.rows[s.id] ?? 'present' })
    return { ...m, ...(draft.key === key ? draft.map : {}) }
  }, [students, day.data, draft, key])

  if (!ready) return <Loading error={error} />
  const cls = q.klass(cid)
  const setStatus = (sid: string, st: Status) => setDraft({ key, map: { ...att, [sid]: st } })
  const count = (s: Status) => students.filter((x) => att[x.id] === s).length
  const doSave = async () => { setSaving(true); await save(cid, date, att); setSaving(false) }
  const nameOf = (id: string) => q.student(id)?.name

  return (
    <section>
      <h1 className="page-title mb-1">Điểm danh</h1>
      <p className="text-slate-500 mb-3">Chọn lớp để điểm danh hoặc xem lại lịch sử.</p>
      <ClassSelect classes={core.classes} value={cid} onChange={(id) => { setCid(id); setDate(today); setTab('mark') }}
        sub={(c) => `${q.schedule(c)} · ${q.enrolled(c.id).length} học sinh`} dot={(c) => q.color(c).dot} teacherOf={me.isCenter && me.isAdmin ? (c) => q.teacherName(c.teacher_id) : undefined} />
      {!core.classes.length && <Empty icon="📚">Chưa có lớp nào. Hãy tạo lớp ở mục Lớp học.</Empty>}

      {!cls ? (core.classes.length > 0 && <Empty icon="👆">Hãy chọn lớp</Empty>) : (
        <div>
          <Tabs value={tab} onChange={setTab} tabs={[['mark', 'Điểm danh'], ['history', 'Lịch sử']]} />

          {tab === 'mark' && (
            <div>
              <div className="bg-white rounded-lg shadow-sm p-3 mb-3 flex flex-wrap items-center gap-2">
                <button className="border rounded-full w-8 h-8" onClick={() => setDate(shiftDay(date, -1))}>‹</button>
                <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="border rounded px-2 py-1" />
                <button className="border rounded-full w-8 h-8" onClick={() => setDate(shiftDay(date, 1))}>›</button>
                <button className="text-xs border rounded px-2 py-1.5" onClick={() => setDate(today)}>Hôm nay</button>
                <span className="font-medium">{wd(date)}</span>
                <span className={`ml-auto text-xs rounded px-2 py-1 ${day.data?.sessionId ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{day.isLoading ? '…' : day.data?.sessionId ? '✓ Đã điểm danh' : 'Chưa điểm danh'}</span>
                {day.isError && <div className="w-full text-xs text-rose-600">Không tải được điểm danh ngày này, hãy thử đổi ngày rồi quay lại.</div>}
                {!cls.days.includes(parseDate(date).getDay()) && <div className="w-full text-xs text-amber-600">⚠ Ngày này không nằm trong lịch học của lớp.</div>}
              </div>
              <div className="bg-white rounded-lg shadow-sm">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2 border-b last:border-0">
                    <Avatar name={s.name} />
                    <span className="font-medium flex-1">{s.name}</span>
                    <div className="flex gap-1 text-xs shrink-0">
                      {STATUS.map(([st, label, on]) => (
                        <button key={st} className={`px-2.5 py-1.5 rounded-full border ${att[s.id] === st ? on : 'text-slate-500'}`} onClick={() => setStatus(s.id, st)}>{label}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {!students.length && <div className="p-6 text-center text-slate-400">Lớp chưa có học sinh. Hãy thêm học sinh vào lớp ở mục Lớp học.</div>}
              </div>
              {students.length > 0 && (
                <div className="sticky bottom-16 md:bottom-3 z-10 mt-3 bg-white rounded-lg shadow-lg border p-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-600 mr-auto">Có mặt {count('present')} · Phép {count('excused')} · Vắng {count('absent')}</span>
                  <button className="border rounded px-3 py-1.5" onClick={() => setDraft({ key, map: Object.fromEntries(students.map((s) => [s.id, 'present' as Status])) })}>Tất cả có mặt</button>
                  <button disabled={saving || day.isLoading || day.isError} title={day.isError ? 'Không tải được dữ liệu ngày này' : undefined} className="bg-indigo-600 text-white rounded px-4 py-1.5 disabled:opacity-50" onClick={doSave}>{saving ? 'Đang lưu…' : day.isLoading ? 'Đang tải…' : 'Lưu điểm danh'}</button>
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div>
              <h2 className="font-semibold mb-2">Chuyên cần theo học sinh</h2>
              <div className="bg-white rounded-lg shadow-sm overflow-x-auto mb-4">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500"><tr><th>Học sinh</th><th>Có mặt</th><th>Phép</th><th>Vắng</th><th>Chuyên cần</th></tr></thead>
                  <tbody>
                    {attStudentStats(students, byStudent.data ?? new Map()).map((r) => (
                      <tr key={r.st.id} className="border-t">
                        <td className="font-medium">{r.st.name}</td><td>{r.present}</td><td>{r.excused}</td>
                        <td className={r.absent >= 3 ? 'text-rose-600 font-semibold' : ''}>{r.absent}</td>
                        <td className="w-40">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 bg-slate-200 rounded"><div className={`h-1.5 rounded ${(r.rate ?? 0) >= 80 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: (r.rate ?? 0) + '%' }} /></div>
                            <span className="text-xs w-9">{r.rate === null ? '—' : r.rate + '%'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h2 className="font-semibold mb-2">Các buổi đã điểm danh</h2>
              <div className="space-y-2">
                {(history.data ?? []).map((h) => (
                  <div key={h.id} className="bg-white rounded-lg shadow-sm p-3 flex flex-wrap items-center gap-2">
                    <div className="w-28"><div className="font-semibold">{fmtDate(h.date)}</div><div className="text-xs text-slate-500">{wd(h.date)}</div></div>
                    <span className="text-xs rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700">{h.present} có mặt</span>
                    {h.excused > 0 && <span className="text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-700">{h.excused} phép</span>}
                    {h.absent > 0 && <span className="text-xs rounded-full px-2 py-0.5 bg-rose-100 text-rose-700">{h.absent} vắng</span>}
                    {h.absentIds.length > 0 && <span className="text-xs text-slate-500 flex-1 min-w-32">Vắng: {h.absentIds.map(nameOf).filter(Boolean).join(', ')}</span>}
                    <button className="text-xs text-indigo-600 ml-auto" onClick={() => { setDate(h.date); setTab('mark') }}>Xem / sửa</button>
                  </div>
                ))}
                {history.isLoading && <Loading />}
                {history.data && !history.data.length && <Empty>Lớp chưa có buổi điểm danh nào.</Empty>}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
