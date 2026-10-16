'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../me'
import { createClient } from '../supabase/client'
import { fakeAiGrade, type ExamStatus } from '../exams'
import { selectAll } from './paginate'
import { KEYS, useRun } from './run'
import type { AiResult, Exam, Student } from './types'

export type SubRow = {
  id: string; exam_id: string; student_id: string; status: 'uploaded' | 'ai_graded' | 'approved'
  score: number | null; comment: string; note: string; ai_result: AiResult | null; reviewed_at: string | null; images: number
}
export type MsgRow = { id: string; exam_id: string; student_id: string; content: string; status: string; sent_at: string | null }
export type ClassExams = { exams: Exam[]; subs: SubRow[]; msgs: MsgRow[] }

/** Bài kiểm tra của một lớp + bài làm + tin đã gửi (đủ cho ma trận điểm và trang bài kiểm tra) */
export function useClassExams(classId: string) {
  const me = useMe()
  return useQuery({
    queryKey: ['exams', me.orgId, classId],
    enabled: !!classId,
    queryFn: async (): Promise<ClassExams> => {
      const sb = createClient()
      const { data: exams, error } = await sb.from('exams').select('*').eq('class_id', classId).order('date')
      if (error) throw error
      const ids = exams.map((e) => e.id)
      if (!ids.length) return { exams: [], subs: [], msgs: [] }
      const [rows, msgs] = await Promise.all([
        selectAll((a, b) => sb.from('submissions').select('id, exam_id, student_id, status, score, comment, note, ai_result, reviewed_at, submission_images(count)').in('exam_id', ids).order('id').range(a, b)),
        selectAll((a, b) => sb.from('messages').select('id, exam_id, student_id, content, status, sent_at').in('exam_id', ids).order('created_at').order('id').range(a, b)),
      ])
      const subs = rows.map(({ submission_images, ...r }) => ({ ...r, ai_result: r.ai_result as AiResult | null, images: (submission_images as { count: number }[])[0]?.count ?? 0 })) as SubRow[]
      return { exams, subs, msgs: msgs as MsgRow[] }
    },
  })
}

export function useExamById(examId: string) {
  const me = useMe()
  return useQuery({
    queryKey: ['exam', me.orgId, examId],
    queryFn: async () => {
      const { data, error } = await createClient().from('exams').select('*').eq('id', examId).maybeSingle()
      if (error) throw error
      return data as Exam | null
    },
  })
}

export function makeExamQ(d: ClassExams, students: Student[]) {
  const submissionOf = (eid: string, sid: string) => d.subs.find((x) => x.exam_id === eid && x.student_id === sid)
  const messagesOf = (eid: string, sid: string) => d.msgs.filter((m) => m.exam_id === eid && m.student_id === sid && m.status === 'sent')
  const examStatus = (eid: string, sid: string): ExamStatus => {
    if (messagesOf(eid, sid).length) return 'sent'
    const s = submissionOf(eid, sid)
    if (!s) return 'none'
    if (s.status === 'approved') return 'approved'
    if (s.status === 'ai_graded') return 'ai'
    return s.images > 0 ? 'uploaded' : 'none'
  }
  const examStats = (eid: string) => {
    const st = students.map((s) => examStatus(eid, s.id))
    const n = (k: ExamStatus) => st.filter((x) => x === k).length
    return { total: st.length, scored: n('approved') + n('sent'), uploaded: n('uploaded'), ai: n('ai'), approved: n('approved'), sent: n('sent') }
  }
  const avg = (sid: string) => {
    const v = d.subs.filter((x) => x.student_id === sid && x.score !== null)
      .map((x) => { const e = d.exams.find((e) => e.id === x.exam_id); return e ? (x.score! / e.max_score) * 10 : null })
      .filter((x): x is number => x !== null)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }
  const gradeMatrix = () => students.map((st) => ({ st, avg: avg(st.id), cells: d.exams.map((e) => ({ e, r: submissionOf(e.id, st.id) })) }))
  const studentGrades = (sid: string) => {
    const rows = d.exams.map((e, i) => ({ e, no: i + 1, r: submissionOf(e.id, sid) })).reverse()
    const vals = rows.filter((x) => x.r && x.r.score !== null).map((x) => x.r!.score as number)
    return { rows, avg: avg(sid), best: vals.length ? Math.max(...vals) : null, low: vals.length ? Math.min(...vals) : null }
  }
  return { submissionOf, messagesOf, examStatus, examStats, avg, gradeMatrix, studentGrades }
}
export type ExamQ = ReturnType<typeof makeExamQ>

/** Ảnh của một bài làm, kèm signed URL (bucket private) */
export function useSubmissionImages(submissionId: string | undefined) {
  return useQuery({
    queryKey: ['images', submissionId],
    enabled: !!submissionId,
    queryFn: async () => {
      const sb = createClient()
      const { data, error } = await sb.from('submission_images').select('id, storage_path, position').eq('submission_id', submissionId!).order('position')
      if (error) throw error
      if (!data.length) return []
      const { data: urls, error: e2 } = await sb.storage.from('submissions').createSignedUrls(data.map((r) => r.storage_path), 3600)
      if (e2) throw e2
      return data.map((r, i) => ({ id: r.id, path: r.storage_path, url: urls[i]?.signedUrl ?? '' }))
    },
  })
}

export function useExamActions() {
  const me = useMe()
  const sb = createClient()
  const run = useRun()
  const qc = useQueryClient()

  /** đảm bảo có bản ghi bài làm cho (bài, học sinh), trả về id */
  const ensureSubmission = async (examId: string, studentId: string) => {
    const { data: ex } = await sb.from('submissions').select('id').eq('exam_id', examId).eq('student_id', studentId).maybeSingle()
    if (ex) return ex.id
    const { data, error } = await sb.from('submissions').insert({ org_id: me.orgId, exam_id: examId, student_id: studentId }).select('id').single()
    if (error) throw error
    return data.id
  }

  return {
    updateTemplate: (template: string | null) => run(() => sb.from('orgs').update({ zalo_template: template }).eq('id', me.orgId), ['me'], 'Đã lưu mẫu tin'),

    saveScores: (examId: string, rows: Record<string, { score: number | ''; comment: string }>) =>
      run(() => sb.rpc('save_scores', { p_exam: examId, p_rows: Object.entries(rows).map(([student_id, v]) => ({ student_id, score: v.score === '' ? null : v.score, comment: v.comment.trim() })) }),
        KEYS.exam, 'Đã lưu điểm'),

    /** duyệt: lưu điểm + nhận xét (gửi phụ huynh) + ghi chú riêng */
    approve: async (examId: string, studentId: string, score: number, comment: string, note: string) => {
      const r = await run(() => sb.rpc('save_scores', { p_exam: examId, p_rows: [{ student_id: studentId, score, comment: comment.trim() }] }), [])
      if (!r.ok) return r
      return run(() => sb.from('submissions').update({ note }).eq('exam_id', examId).eq('student_id', studentId), KEYS.exam, 'Đã duyệt và lưu điểm')
    },

    addImages: async (examId: string, studentId: string, blobs: Blob[], startPos: number) => {
      try {
        const subId = await ensureSubmission(examId, studentId)
        for (let i = 0; i < blobs.length; i++) {
          const path = `${me.orgId}/${examId}/${studentId}/${crypto.randomUUID()}.jpg`
          const up = await sb.storage.from('submissions').upload(path, blobs[i], { contentType: 'image/jpeg' })
          if (up.error) throw up.error
          const ins = await sb.from('submission_images').insert({ org_id: me.orgId, submission_id: subId, storage_path: path, position: startPos + i })
          if (ins.error) throw ins.error
        }
        return run(async () => ({ data: null, error: null }), ['exams', 'images'], `Đã thêm ${blobs.length} ảnh`)
      } catch (e) {
        return run(async () => ({ data: null, error: { message: (e as { message?: string }).message ?? 'Không upload được ảnh' } }), [])
      }
    },

    removeImage: async (img: { id: string; path: string }) => {
      await sb.storage.from('submissions').remove([img.path])
      return run(() => sb.from('submission_images').delete().eq('id', img.id), ['exams', 'images'])
    },

    /** refresh=false khi chấm hàng loạt: gọi refresh() một lần ở cuối thay vì làm mới sau từng học sinh */
    aiGrade: async (exam: Exam, studentId: string, studentAvg: number | null, currentStatus: SubRow['status'], refresh = true) => {
      const ai = await fakeAiGrade({ studentAvg, exam, studentId })
      return run(() => sb.from('submissions').update({ ai_result: ai as never, status: currentStatus === 'approved' ? 'approved' : 'ai_graded' }).eq('exam_id', exam.id).eq('student_id', studentId), refresh ? ['exams'] : [])
    },
    refresh: () => qc.invalidateQueries({ queryKey: ['exams'] }),

    /** Giả lập gửi Zalo: chỉ ghi lịch sử vào bảng messages. Bản thật: gọi Zalo OA ở server rồi ghi kết quả. */
    sendZalo: async (items: { examId: string; studentId: string; content: string }[]) => {
      await new Promise((r) => setTimeout(r, 900))
      const at = new Date().toISOString()
      return run(() => sb.from('messages').insert(items.map((i) => ({ org_id: me.orgId, exam_id: i.examId, student_id: i.studentId, channel: 'zalo', content: i.content, status: 'sent', sent_at: at }))), ['exams'])
    },
  }
}
