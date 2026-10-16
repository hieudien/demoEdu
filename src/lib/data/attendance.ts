'use client'
import { useQuery } from '@tanstack/react-query'
import { useMe } from '../me'
import { createClient } from '../supabase/client'
import { useRun } from './run'
import type { Status, Student } from './types'

/** Điểm danh của một lớp trong một ngày: { sessionId, rows: studentId → status } */
export function useAttendance(classId: string, date: string) {
  const me = useMe()
  return useQuery({
    queryKey: ['attendance', 'day', me.orgId, classId, date],
    enabled: !!classId,
    queryFn: async () => {
      const sb = createClient()
      const { data: s, error } = await sb.from('sessions').select('id').eq('class_id', classId).eq('date', date).maybeSingle()
      if (error) throw error
      const rows: Record<string, Status> = {}
      if (s) {
        const { data, error: e2 } = await sb.from('attendance').select('student_id, status').eq('session_id', s.id)
        if (e2) throw e2
        data.forEach((r) => { rows[r.student_id] = r.status as Status })
      }
      return { sessionId: s?.id ?? null, rows }
    },
  })
}

export type HistoryRow = { id: string; date: string; present: number; excused: number; absent: number; absentIds: string[] }

/** Các buổi đã điểm danh của lớp (200 buổi gần nhất) */
export function useAttendanceHistory(classId: string) {
  const me = useMe()
  return useQuery({
    queryKey: ['attendance', 'history', me.orgId, classId],
    enabled: !!classId,
    queryFn: async (): Promise<HistoryRow[]> => {
      const { data, error } = await createClient().from('sessions').select('id, date, attendance(student_id, status)')
        .eq('class_id', classId).order('date', { ascending: false }).limit(200)
      if (error) throw error
      return data.map((s) => {
        const a = s.attendance as { student_id: string; status: Status }[]
        const n = (k: Status) => a.filter((x) => x.status === k).length
        return { id: s.id, date: s.date, present: n('present'), excused: n('excused'), absent: n('absent'), absentIds: a.filter((x) => x.status === 'absent').map((x) => x.student_id) }
      })
    },
  })
}

export function attStudentStats(students: Student[], rawByStudent: Map<string, { present: number; excused: number; absent: number }>) {
  return students.map((st) => {
    const r = rawByStudent.get(st.id) ?? { present: 0, excused: 0, absent: 0 }
    const total = r.present + r.excused + r.absent
    return { st, ...r, rate: total ? Math.round((r.present / total) * 100) : null }
  })
}

/** Tổng hợp chuyên cần từng học sinh của lớp (tính trong DB bằng attendance_by_student) */
export function useAttendanceByStudent(classId: string) {
  const me = useMe()
  return useQuery({
    queryKey: ['attendance', 'by-student', me.orgId, classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await createClient().rpc('attendance_by_student', { p_class: classId })
      if (error) throw error
      return new Map(data.map((r) => [r.student_id, { present: r.present, excused: r.excused, absent: r.absent }]))
    },
  })
}

export function useSaveAttendance() {
  const run = useRun()
  const sb = createClient()
  return (classId: string, date: string, map: Record<string, Status>) =>
    run(() => sb.rpc('save_attendance', { p_class: classId, p_date: date, p_rows: Object.entries(map).map(([student_id, status]) => ({ student_id, status })) }),
      ['attendance'], 'Đã lưu điểm danh')
}
