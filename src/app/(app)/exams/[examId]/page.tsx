'use client'
import Link from 'next/link'
import { use, useState } from 'react'
import { FormModal } from '@/components/FormModal'
import { useToast } from '@/components/Providers'
import { Avatar, Empty, Loading, Modal } from '@/components/ui'
import { useCoreQ } from '@/lib/data/core'
import { makeExamQ, useClassExams, useExamActions, useExamById } from '@/lib/data/exams'
import { DEFAULT_ZALO, EXAM_STATUS, buildMessage } from '@/lib/exams'
import { useMe } from '@/lib/me'
import { fmtDate } from '@/lib/utils'

export default function ExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params)
  const me = useMe()
  const toast = useToast()
  const { ready, error, q } = useCoreQ()
  const exam = useExamById(examId)
  const classId = exam.data?.class_id ?? ''
  const data = useClassExams(classId)
  const act = useExamActions()
  const [busy, setBusy] = useState('')
  const [edit, setEdit] = useState(false)
  const [tpl, setTpl] = useState<string | null>(null)

  if (!ready || exam.isLoading || (classId && data.isLoading)) return <Loading error={error} />
  const cls = q.klass(classId)
  if (!exam.data || !cls || !data.data) return <Empty>Không tìm thấy bài kiểm tra.</Empty>
  const e = exam.data
  const students = q.enrolled(classId)
  const eq = makeExamQ(data.data, students)
  const st = eq.examStats(e.id)

  const aiAll = async () => {
    setBusy('ai')
    const todo = students.filter((s) => eq.examStatus(e.id, s.id) === 'uploaded')
    await Promise.all(todo.map((s) => act.aiGrade(e, s.id, eq.avg(s.id), eq.submissionOf(e.id, s.id)!.status, false)))
    await act.refresh()
    setBusy('')
    toast(todo.length ? `AI đã chấm ${todo.length} bài (giả lập)` : 'Không có bài nào cần chấm')
  }
  const zaloAll = async () => {
    setBusy('zalo')
    const items = students.filter((s) => eq.examStatus(e.id, s.id) === 'approved').map((s) => {
      const sub = eq.submissionOf(e.id, s.id)!
      return { examId: e.id, studentId: s.id, content: buildMessage({ template: me.zaloTemplate, exam: e, student: s, subject: cls.subject_id ? q.subjectName(cls.subject_id) : cls.name, score: sub.score, comment: sub.comment, org: me.orgName }) }
    })
    if (items.length) { const r = await act.sendZalo(items); if (r.ok) toast(`Đã gửi Zalo cho ${items.length} phụ huynh (giả lập)`) } else toast('Không có tin nào cần gửi')
    setBusy('')
  }

  return (
    <section>
      <Link className="text-indigo-600 mb-2 inline-block" href={`/exams?class=${classId}`}>← Bài kiểm tra · {cls.name}</Link>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h1 className="page-title mr-auto">{e.name}</h1>
        <button className="text-xs border rounded px-2 py-1 bg-white" onClick={() => setEdit(true)}>Sửa thông tin / đề bài</button>
        {me.isAdmin && <button className="text-xs border rounded px-2 py-1 bg-white" onClick={() => setTpl(me.zaloTemplate ?? DEFAULT_ZALO)}>Mẫu tin Zalo</button>}
      </div>
      <p className="text-slate-500 mb-3">{fmtDate(e.date)} · thang điểm {e.max_score} · {st.scored}/{st.total} em đã có điểm</p>
      {e.brief && <div className="bg-white rounded-lg shadow-sm p-3 mb-3 text-xs text-slate-600"><b>Đề/đáp án:</b> {e.brief}</div>}

      <div className="flex flex-wrap gap-2 mb-3">
        <button disabled={!!busy || !st.uploaded} className="bg-violet-600 text-white rounded px-3 py-1.5 disabled:opacity-40" onClick={aiAll}>
          {busy === 'ai' ? 'AI đang chấm…' : `AI chấm tất cả bài đã up (${st.uploaded})`}
        </button>
        <button disabled={!!busy || !st.approved} className="bg-teal-600 text-white rounded px-3 py-1.5 disabled:opacity-40" onClick={zaloAll}>
          {busy === 'zalo' ? 'Đang gửi…' : `Gửi Zalo cho tất cả em đã duyệt (${st.approved})`}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        {students.map((s) => {
          const status = eq.examStatus(e.id, s.id)
          const sub = eq.submissionOf(e.id, s.id)
          const [label, badge] = EXAM_STATUS[status]
          return (
            <Link key={s.id} href={`/exams/${e.id}/${s.id}`} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0 hover:bg-slate-50">
              <Avatar name={s.name} />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-slate-500">PH {s.parent_name} · {s.parent_phone}</div>
              </div>
              {sub && sub.images > 0 && <span className="text-xs text-slate-500 hidden sm:inline">🖼 {sub.images} ảnh</span>}
              <span className="w-16 text-center font-semibold">{sub && sub.score !== null ? `${sub.score}/${e.max_score}` : sub?.ai_result ? <span className="text-violet-500 text-xs font-normal">AI: {sub.ai_result.score}</span> : '—'}</span>
              <span className={`text-xs rounded-full px-2 py-0.5 whitespace-nowrap ${badge}`}>{label}</span>
            </Link>
          )
        })}
        {!students.length && <div className="p-6 text-center text-slate-400">Lớp chưa có học sinh.</div>}
      </div>
      <p className="text-xs text-slate-400 mt-2">AI chấm và gửi Zalo hiện là giả lập: kết quả được lưu thật vào hệ thống nhưng chưa gọi dịch vụ bên ngoài.</p>

      {edit && <FormModal table="exams" item={e} onClose={() => setEdit(false)} />}
      <Modal open={tpl !== null} onClose={() => setTpl(null)}>
        <h2 className="font-bold text-base mb-2">Mẫu tin nhắn Zalo</h2>
        <textarea className="w-full border rounded px-2 py-1.5" rows={5} value={tpl ?? ''} onChange={(ev) => setTpl(ev.target.value)} />
        <p className="text-xs text-slate-400 mt-1">Biến: {'{ten} {bai} {mon} {ngay} {diem} {thang} {nhanxet} {trungtam}'}</p>
        <div className="flex justify-between mt-3">
          <button className="text-xs text-slate-500 underline" onClick={() => setTpl(DEFAULT_ZALO)}>Khôi phục mặc định</button>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded border" onClick={() => setTpl(null)}>Hủy</button>
            <button className="px-4 py-1.5 rounded bg-indigo-600 text-white" onClick={async () => { if ((await act.updateTemplate(tpl === DEFAULT_ZALO ? null : tpl)).ok) setTpl(null) }}>Lưu</button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
