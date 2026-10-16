'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useToast } from '@/components/Providers'
import { useMe } from '../me'
import { createClient } from '../supabase/client'
import { PALETTE, iso } from '../utils'
import { selectAll } from './paginate'
import { KEYS, useRun } from './run'
import { timeRange, type Cls, type Enrollment, type Insert, type Student, type Subject, type Teacher } from './types'

/** Dữ liệu nhỏ, dùng ở hầu hết các trang: tải một lần, giữ trong cache. RLS đã lọc theo vai trò. */
export type Core = { teachers: Teacher[]; subjects: Subject[]; classes: Cls[]; students: Student[]; enrollments: Enrollment[] }

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'vi')

export function useCore() {
  const me = useMe()
  return useQuery({
    queryKey: ['core', me.orgId],
    queryFn: async (): Promise<Core> => {
      const sb = createClient()
      const [teachers, subjects, classes, students, enrollments] = await Promise.all([
        selectAll<Teacher>((a, b) => sb.from('teachers').select('*').order('id').range(a, b)),
        selectAll<Subject>((a, b) => sb.from('subjects').select('*').order('id').range(a, b)),
        selectAll<Cls>((a, b) => sb.from('classes').select('*').order('id').range(a, b)),
        selectAll<Student>((a, b) => sb.from('students').select('*').order('id').range(a, b)),
        selectAll<Enrollment>((a, b) => sb.from('enrollments').select('*').is('end_date', null).order('id').range(a, b)),
      ])
      return { teachers: teachers.sort(byName), subjects: subjects.sort(byName), classes: classes.sort(byName), students: students.sort(byName), enrollments }
    },
  })
}

export function makeCoreQ(core: Core) {
  const studentById = new Map(core.students.map((s) => [s.id, s]))
  const classById = new Map(core.classes.map((c) => [c.id, c]))
  const classIndex = new Map(core.classes.map((c, i) => [c.id, i]))
  const teacherById = new Map(core.teachers.map((t) => [t.id, t]))
  const subjectById = new Map(core.subjects.map((s) => [s.id, s]))
  const byClass = new Map<string, Student[]>()
  const byStudent = new Map<string, Cls[]>()
  core.enrollments.forEach((e) => {
    const st = studentById.get(e.student_id), c = classById.get(e.class_id)
    if (st) (byClass.get(e.class_id) ?? byClass.set(e.class_id, []).get(e.class_id)!).push(st)
    if (c) (byStudent.get(e.student_id) ?? byStudent.set(e.student_id, []).get(e.student_id)!).push(c)
  })
  const enrolled = (cid: string) => byClass.get(cid) ?? []
  return {
    enrolled,
    klass: (id: string | null | undefined) => (id ? classById.get(id) : undefined),
    student: (id: string) => studentById.get(id),
    teacherName: (id: string | null) => (id && teacherById.get(id)?.name) || '—',
    subjectName: (id: string | null) => (id && subjectById.get(id)?.name) || '—',
    notEnrolled: (cid: string) => { const ids = new Set(enrolled(cid).map((s) => s.id)); return core.students.filter((s) => !ids.has(s.id)) },
    studentClasses: (sid: string) => byStudent.get(sid) ?? [],
    schedule: (c: Cls) => c.days.map((d) => (d ? 'T' + (d + 1) : 'CN')).join(', ') + ' ' + timeRange(c),
    color: (c: Cls) => PALETTE[(classIndex.get(c.id) ?? 0) % PALETTE.length],
  }
}
export type CoreQ = ReturnType<typeof makeCoreQ>

/** Hook tiện dùng cho trang: { ready, core, q }. */
export function useCoreQ() {
  const { data, isLoading, error } = useCore()
  const q = useMemo(() => (data ? makeCoreQ(data) : null), [data])
  return { ready: !!data && !!q, loading: isLoading, error, core: data as Core, q: q as CoreQ }
}

type Tbl = 'students' | 'subjects' | 'classes' | 'exams'
const SAVE_KEYS = { students: KEYS.core, subjects: KEYS.core, classes: KEYS.catalog, exams: KEYS.exam } as const
const DELETE_KEYS = { students: KEYS.everything, classes: KEYS.everything, subjects: KEYS.core, exams: KEYS.exam, events: ['events'] } as const

/** Xóa file ảnh trong Storage của mọi bài làm thuộc phạm vi sắp xóa (DB chỉ xóa dòng, không xóa file). */
async function purgeImages(kind: 'exams' | 'students' | 'classes', id: string) {
  const sb = createClient()
  const rows = await selectAll<{ storage_path: string }>((a, b) => {
    const t = sb.from('submission_images')
    const q = kind === 'exams' ? t.select('storage_path, submissions!inner(exam_id)').eq('submissions.exam_id', id)
      : kind === 'students' ? t.select('storage_path, submissions!inner(student_id)').eq('submissions.student_id', id)
      : t.select('storage_path, submissions!inner(exams!inner(class_id))').eq('submissions.exams.class_id', id)
    return q.order('id').range(a, b) as unknown as PromiseLike<{ data: { storage_path: string }[] | null; error: { message: string } | null }>
  })
  for (let i = 0; i < rows.length; i += 100) {
    const r = await sb.storage.from('submissions').remove(rows.slice(i, i + 100).map((x) => x.storage_path))
    if (r.error) throw r.error
  }
}

export function useCoreActions() {
  const me = useMe()
  const sb = createClient()
  const run = useRun()
  const toast = useToast()
  const qc = useQueryClient()
  const refreshCatalog = () => Promise.all(KEYS.catalog.map((k) => qc.invalidateQueries({ queryKey: [k] })))

  /** thêm (không có id) hoặc sửa (có id) một dòng; org_id luôn lấy từ hồ sơ người dùng */
  const save = (table: Tbl, row: Record<string, unknown> & { id?: string }) => {
    const { id, ...rest } = row
    const t = sb.from(table as 'students')
    return id
      ? run(() => t.update(rest as never).eq('id', id).select('id').single(), SAVE_KEYS[table], 'Đã lưu')
      : run(() => t.insert({ ...rest, org_id: me.orgId } as Insert<'students'>).select('id').single(), SAVE_KEYS[table], 'Đã lưu')
  }

  const remove = async (table: Tbl | 'events', id: string) => {
    if (table === 'students' || table === 'classes' || table === 'exams') {
      try { await purgeImages(table, id) } catch (e) {
        toast('Lỗi: không xóa được ảnh bài làm (' + ((e as { message?: string }).message ?? 'không rõ') + ')')
        return { ok: false as const, data: null }
      }
    }
    return run(() => sb.from(table as 'students').delete().eq('id', id), DELETE_KEYS[table], 'Đã xóa')
  }

  const CHUNK = 500
  const today = () => iso(new Date())

  /** Thêm nhiều học sinh một lúc (chia lô 500), có thể xếp luôn vào lớp. Lỗi giữa chừng thì báo số đã thêm. */
  const createStudents = async (rows: { name: string; dob: string | null; parent_name: string; parent_phone: string }[], classId?: string) => {
    let created = 0
    for (let i = 0; i < rows.length; i += CHUNK) {
      const ins = await sb.from('students').insert(rows.slice(i, i + CHUNK).map((r) => ({ ...r, org_id: me.orgId }))).select('id')
      if (ins.error) { await refreshCatalog(); toast(`Lỗi: ${ins.error.message}${created ? ` (đã thêm ${created} học sinh trước đó)` : ''}`); return { ok: false as const, created } }
      created += ins.data.length
      if (classId) {
        const en = await sb.from('enrollments').insert(ins.data.map((s) => ({ org_id: me.orgId, student_id: s.id, class_id: classId, start_date: today() })))
        if (en.error) { await refreshCatalog(); toast(`Đã thêm ${created} học sinh nhưng xếp lớp bị lỗi: ${en.error.message}`); return { ok: false as const, created } }
      }
    }
    await refreshCatalog()
    return { ok: true as const, created }
  }

  /** Ghi danh nhiều học sinh vào một lớp (người gọi đã loại các em đang học lớp đó). */
  const enrollMany = async (studentIds: string[], classId: string) => {
    for (let i = 0; i < studentIds.length; i += CHUNK) {
      const r = await sb.from('enrollments').insert(studentIds.slice(i, i + CHUNK).map((s) => ({ org_id: me.orgId, student_id: s, class_id: classId, start_date: today() })))
      if (r.error) { await refreshCatalog(); toast('Lỗi: ' + r.error.message); return { ok: false as const }
      }
    }
    await refreshCatalog(); toast(`Đã thêm ${studentIds.length} học sinh vào lớp`)
    return { ok: true as const }
  }

  const unenrollMany = async (studentIds: string[], classId: string) => {
    for (let i = 0; i < studentIds.length; i += 100) {
      const r = await sb.from('enrollments').update({ end_date: today() }).eq('class_id', classId).in('student_id', studentIds.slice(i, i + 100)).is('end_date', null)
      if (r.error) { await refreshCatalog(); toast('Lỗi: ' + r.error.message); return { ok: false as const } }
    }
    await refreshCatalog(); toast(`Đã rút ${studentIds.length} học sinh khỏi lớp`)
    return { ok: true as const }
  }

  return {
    save, remove, createStudents, enrollMany, unenrollMany,
    // start_date lấy theo ngày địa phương của người dùng, không dùng ngày UTC của server
    enroll: (studentId: string, classId: string) =>
      run(() => sb.from('enrollments').insert({ org_id: me.orgId, student_id: studentId, class_id: classId, start_date: iso(new Date()) }), KEYS.catalog, 'Đã thêm vào lớp'),
    unenroll: (studentId: string, classId: string) =>
      run(() => sb.from('enrollments').update({ end_date: iso(new Date()) }).eq('student_id', studentId).eq('class_id', classId).is('end_date', null), KEYS.catalog, 'Đã rút khỏi lớp'),
  }
}
