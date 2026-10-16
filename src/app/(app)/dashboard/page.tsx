'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { FormModal } from '@/components/FormModal'
import { useConfirm } from '@/components/Providers'
import { Loading } from '@/components/ui'
import { calCells, calRange, dayItems, useCalendarActions, useEvents, useFrequentAbsent, useSessionsOn, type DayItem } from '@/lib/data/calendar'
import { useCoreQ } from '@/lib/data/core'
import { feeRows, feeTotals, useFees } from '@/lib/data/fees'
import { useMe } from '@/lib/me'
import { fmtDate, iso, shiftDay, shiftMonth, vnd, wd } from '@/lib/utils'

const itemCls = (it: DayItem) =>
  it.kind === 'off' ? 'text-slate-400 line-through' : it.kind === 'exam' ? 'text-rose-700' : it.kind === 'makeup' ? 'text-amber-700' : ''
const itemDot = (it: DayItem, dot: string) =>
  it.kind === 'off' ? 'bg-slate-300' : it.kind === 'exam' ? 'bg-rose-500' : it.kind === 'makeup' ? 'bg-amber-500' : dot
const KIND_TAG: Record<DayItem['kind'], string | null> = { class: null, off: 'Nghỉ', makeup: 'Học bù', exam: 'Kiểm tra' }

export default function DashboardPage() {
  const me = useMe()
  const today = iso(new Date())
  const thisMonth = today.slice(0, 7)
  const { ready, error, core, q } = useCoreQ()
  const [calMonth, setCalMonth] = useState(thisMonth)
  const [calDay, setCalDay] = useState(today)
  const [form, setForm] = useState(false)
  const confirm = useConfirm()
  const cal = useCalendarActions()

  const range = calRange(calMonth)
  const events = useEvents(range.from, range.to)
  const soon = useEvents(today, shiftDay(today, 6))
  const sessionsOn = useSessionsOn(calDay)
  const absent = useFrequentAbsent(today, core?.students ?? [])
  const fees = useFees(thisMonth)

  const evs = events.data ?? []
  const cells = useMemo(() => (core ? calCells(core.classes, evs, calMonth) : []), [core, evs, calMonth])
  if (!ready) return <Loading error={error} />

  const items = dayItems(core.classes, evs, calDay)
  const money = fees.data ? feeTotals(feeRows(core, fees.data)) : null
  const [y, m] = calMonth.split('-')
  const pick = (date: string) => { setCalDay(date); setCalMonth(date.slice(0, 7)) }
  const upcoming = Array.from({ length: 7 }, (_, i) => shiftDay(today, i))
    .map((date) => ({ date, items: dayItems(core.classes, soon.data ?? [], date) })).filter((d) => d.items.length)

  return (
    <section>
      <h1 className="page-title mb-3">Tổng quan <span className="text-slate-400 font-normal text-sm">· hôm nay {fmtDate(today)}</span></h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Học sinh" value={core.students.length} />
        <Stat label="Lớp đang dạy" value={core.classes.length} />
        {me.isAdmin && <Stat label="Đã thu tháng này" value={money ? vnd(money.paid) : '…'} cls="text-emerald-600 text-xl" />}
        {me.isAdmin && <Stat label="Còn nợ tháng này" value={money ? vnd(money.debt) : '…'} cls="text-rose-600 text-xl" />}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* Trái: lịch nhỏ */}
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="flex items-center gap-2 mb-3">
            <button className="border rounded-full w-8 h-8" aria-label="Tháng trước" onClick={() => setCalMonth(shiftMonth(calMonth, -1))}>‹</button>
            <h2 className="font-semibold flex-1 text-center">Tháng {m}/{y}</h2>
            <button className="border rounded-full w-8 h-8" aria-label="Tháng sau" onClick={() => setCalMonth(shiftMonth(calMonth, 1))}>›</button>
            <button className="text-xs border rounded px-2 py-1.5" onClick={() => pick(today)}>Hôm nay</button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-slate-500 mb-1">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded overflow-hidden">
            {cells.map((cell) => (
              <button key={cell.date} onClick={() => setCalDay(cell.date)} aria-label={fmtDate(cell.date)}
                className={`cal-cell h-14 p-1 text-left flex flex-col items-start justify-between ${cell.inMonth ? 'bg-white' : 'bg-slate-50 text-slate-300'} ${calDay === cell.date ? 'ring-2 ring-inset ring-indigo-500' : ''}`}>
                <span className={`text-xs w-5 h-5 inline-flex items-center justify-center rounded-full ${cell.date === today ? 'bg-indigo-600 text-white' : ''}`}>{+cell.date.slice(8)}</span>
                <span className="flex flex-wrap items-center gap-0.5 min-h-2.5">
                  {cell.items.slice(0, 4).map((it) => <span key={it.key} className={`w-1.5 h-1.5 rounded-full ${itemDot(it, q.color(it.c).dot)}`} />)}
                  {cell.items.length > 4 && <span className="text-[9px] text-slate-400 leading-none">+{cell.items.length - 4}</span>}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2">
            <Legend c="bg-indigo-500" t="Buổi học (màu theo lớp)" /><Legend c="bg-amber-500" t="Học bù" />
            <Legend c="bg-rose-500" t="Kiểm tra" /><Legend c="bg-slate-300" t="Nghỉ" />
          </div>
        </div>

        {/* Phải: sự kiện */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-3">
            <div className="flex items-center mb-1">
              <h2 className="font-semibold mr-auto">{wd(calDay)}, {fmtDate(calDay)}</h2>
              {core.classes.length > 0 && <button className="text-xs bg-indigo-600 text-white rounded px-2 py-1" onClick={() => setForm(true)}>+ Sự kiện</button>}
            </div>
            {items.map((it) => (
              <div key={it.key} className="flex items-center gap-2 border-t py-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${itemDot(it, q.color(it.c).dot)}`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium truncate ${itemCls(it)}`}>{it.label}</div>
                  <div className="text-xs text-slate-500">{it.time} · {it.c.room || '—'}{me.isCenter ? ' · ' + q.teacherName(it.c.teacher_id) : ''}{it.ev?.note ? ' · ' + it.ev.note : ''}</div>
                </div>
                {it.kind !== 'off' && sessionsOn.data?.has(it.c.id) && <span className="text-xs text-emerald-600 whitespace-nowrap">✓ đã điểm danh</span>}
                {(it.kind === 'class' || it.kind === 'makeup') && (
                  <Link className="text-xs bg-indigo-50 text-indigo-700 rounded px-2 py-1 whitespace-nowrap" href={`/attendance?class=${it.c.id}&date=${calDay}`}>Điểm danh</Link>
                )}
                {it.kind === 'class' && <button className="text-xs text-slate-500 underline" onClick={() => cal.markOff(it.c.id, calDay)}>Nghỉ</button>}
                {it.kind === 'off' && <button className="text-xs text-slate-500 underline" onClick={() => cal.deleteEvent(it.ev!.id)}>Bỏ nghỉ</button>}
                {(it.kind === 'makeup' || it.kind === 'exam') && (
                  <button className="text-xs text-rose-600" onClick={async () => (await confirm('Xóa sự kiện này?')) && cal.deleteEvent(it.ev!.id)}>Xóa</button>
                )}
              </div>
            ))}
            {!items.length && <div className="text-slate-400 py-6 text-center border-t mt-1">{core.classes.length ? 'Không có lịch trong ngày này.' : 'Hãy tạo lớp học để có lịch dạy.'}</div>}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3">
            <h2 className="font-semibold mb-1">Sắp tới <span className="text-xs text-slate-400 font-normal">7 ngày</span></h2>
            {upcoming.map((d) => (
              <div key={d.date} className="border-t py-2">
                <button className="text-xs font-semibold text-slate-500 hover:text-indigo-700" onClick={() => pick(d.date)}>
                  {d.date === today ? 'Hôm nay' : wd(d.date)} · {fmtDate(d.date).slice(0, 5)}
                </button>
                <div className="mt-1 space-y-0.5">
                  {d.items.map((it) => (
                    <button key={it.key} onClick={() => pick(d.date)} className="w-full flex items-center gap-2 text-left text-sm rounded px-1.5 py-1 hover:bg-slate-50">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${itemDot(it, q.color(it.c).dot)}`} />
                      <span className="text-xs text-slate-500 w-11 shrink-0">{it.time.slice(0, 5)}</span>
                      <span className={`truncate ${itemCls(it)}`}>{it.c.name}</span>
                      {KIND_TAG[it.kind] && <span className="text-[10px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 ml-auto">{KIND_TAG[it.kind]}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!upcoming.length && <div className="text-slate-400 py-4 text-center border-t mt-1">Không có lịch trong 7 ngày tới.</div>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 mt-4">
        <h2 className="font-semibold mb-2">Vắng nhiều (30 ngày qua)</h2>
        <div className="grid md:grid-cols-2 gap-x-6">
          {(absent.data ?? []).map((r) => (
            <div key={r.st.id} className="flex justify-between border-t py-2">
              <div><span className="font-medium">{r.st.name}</span><div className="text-xs text-slate-500">PH: {r.st.parent_name} · {r.st.parent_phone}</div></div>
              <span className="text-rose-600 font-semibold">{r.n} buổi</span>
            </div>
          ))}
        </div>
        {!absent.data?.length && <div className="text-slate-400 py-4 text-center border-t">Không có học sinh nào.</div>}
      </div>
      {form && <FormModal table="events" defaults={{ date: calDay, class_id: core.classes[0]?.id }} onClose={() => setForm(false)} />}
    </section>
  )
}

function Stat({ label, value, cls = 'text-2xl' }: { label: string; value: React.ReactNode; cls?: string }) {
  return <div className="bg-white rounded-lg p-3 shadow-sm"><div className="text-slate-500 text-xs">{label}</div><div className={`font-bold ${cls}`}>{value}</div></div>
}
function Legend({ c, t }: { c: string; t: string }) {
  return <span><span className={`inline-block w-2 h-2 rounded-full mr-1 ${c}`} />{t}</span>
}
