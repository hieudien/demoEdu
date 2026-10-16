import type { Database } from '../database.types'

type T = Database['public']['Tables']
export type Row<K extends keyof T> = T[K]['Row']
export type Insert<K extends keyof T> = T[K]['Insert']

export type Teacher = Row<'teachers'>
export type Subject = Row<'subjects'>
export type Cls = Row<'classes'>
export type Student = Row<'students'>
export type Enrollment = Row<'enrollments'>
export type Exam = Row<'exams'>
export type CalEvent = Row<'events'>
export type Payment = Row<'payments'>
export type Settings = Row<'org_settings'>

export type Status = 'present' | 'absent' | 'excused'
export type AiResult = { score: number; comment: string; errors: string[]; confidence: number }

export const hm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '')
export const timeRange = (c: Pick<Cls, 'time_start' | 'time_end'>) => `${hm(c.time_start)}-${hm(c.time_end)}`
