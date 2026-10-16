'use client'
import { useQuery } from '@tanstack/react-query'
import { useMe } from '../me'
import { createClient } from '../supabase/client'
import { iso, parseDate } from '../utils'
import { useRun } from './run'
import { hm, timeRange, type CalEvent, type Cls, type Student } from './types'

export type DayItem = {
  key: string; kind: 'class' | 'off' | 'makeup' | 'exam'; c: Cls; time: string; label: string; ev?: CalEvent
}

export function useEvents(from: string, to: string) {
  const me = useMe()
  return useQuery({
    queryKey: ['events', me.orgId, from, to],
    queryFn: async () => {
      const { data, error } = await createClient().from('events').select('*').gte('date', from).lte('date', to)
      if (error) throw error
      return data as CalEvent[]
    },
  })
}

/** Lớp nào đã có buổi điểm danh vào ngày này (để hiện dấu ✓) */
export function useSessionsOn(date: string) {
  const me = useMe()
  return useQuery({
    queryKey: ['attendance', 'on', me.orgId, date],
    queryFn: async () => {
      const { data, error } = await createClient().from('sessions').select('class_id').eq('date', date)
      if (error) throw error
      return new Set(data.map((s) => s.class_id))
    },
  })
}

/** Học sinh vắng từ 2 buổi trở lên trong 30 ngày qua */
export function useFrequentAbsent(today: string, students: Student[]) {
  const me = useMe()
  return useQuery({
    queryKey: ['attendance', 'absent', me.orgId, today],
    queryFn: async () => {
      const d = parseDate(today); d.setDate(d.getDate() - 30)
      const { data, error } = await createClient().from('attendance').select('student_id, sessions!inner(date)')
        .eq('status', 'absent').gte('sessions.date', iso(d))
      if (error) throw error
      const n: Record<string, number> = {}
      data.forEach((r) => { n[r.student_id] = (n[r.student_id] || 0) + 1 })
      return Object.entries(n).filter(([, v]) => v >= 2)
        .map(([id, v]) => ({ st: students.find((s) => s.id === id)!, n: v })).filter((r) => r.st)
        .sort((a, b) => b.n - a.n).slice(0, 6)
    },
    enabled: students.length > 0,
  })
}

/** Buổi học trong ngày = lịch cố định của lớp + sự kiện (học bù / kiểm tra / nghỉ) */
export function dayItems(classes: Cls[], events: CalEvent[], date: string): DayItem[] {
  const dow = parseDate(date).getDay()
  const ev = events.filter((e) => e.date === date)
  const out: DayItem[] = []
  classes.forEach((c) => {
    if (!c.days.includes(dow)) return
    const off = ev.find((e) => e.class_id === c.id && e.type === 'off')
    out.push({ key: 'c' + c.id, kind: off ? 'off' : 'class', c, time: timeRange(c), label: c.name + (off ? ' (nghỉ)' : ''), ev: off })
  })
  ev.filter((e) => e.type !== 'off').forEach((e) => {
    const c = classes.find((x) => x.id === e.class_id)
    if (!c) return
    out.push({ key: 'e' + e.id, kind: e.type as 'makeup' | 'exam', c, time: e.time_start ? hm(e.time_start) : timeRange(c),
      label: c.name + (e.type === 'makeup' ? ' (bù)' : ' · KT'), ev: e })
  })
  return out.sort((a, b) => a.time.localeCompare(b.time))
}

export function calCells(classes: Cls[], events: CalEvent[], month: string) {
  const [y, m] = month.split('-').map(Number)
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const days = new Date(y, m, 0).getDate()
  return Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => {
    const d = new Date(y, m - 1, 1 - lead + i)
    const date = iso(d)
    return { date, inMonth: d.getMonth() === m - 1, items: dayItems(classes, events, date) }
  })
}

/** Khoảng ngày hiển thị của lưới lịch tháng (gồm cả ngày tràn của tháng trước/sau) */
export function calRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const total = Math.ceil((lead + new Date(y, m, 0).getDate()) / 7) * 7
  return { from: iso(new Date(y, m - 1, 1 - lead)), to: iso(new Date(y, m - 1, 1 - lead + total - 1)) }
}

export function useCalendarActions() {
  const me = useMe()
  const sb = createClient()
  const run = useRun()
  return {
    saveEvent: (row: { id?: string; class_id: string; date: string; type: string; time_start?: string | null; note?: string }) => {
      const { id, ...rest } = row
      return id
        ? run(() => sb.from('events').update(rest).eq('id', id), ['events'], 'Đã lưu')
        : run(() => sb.from('events').insert({ ...rest, org_id: me.orgId }), ['events'], 'Đã lưu')
    },
    deleteEvent: (id: string) => run(() => sb.from('events').delete().eq('id', id), ['events'], 'Đã xóa'),
    markOff: (classId: string, date: string) =>
      run(() => sb.from('events').insert({ org_id: me.orgId, class_id: classId, date, type: 'off' }), ['events'], 'Đã đánh dấu nghỉ'),
  }
}
