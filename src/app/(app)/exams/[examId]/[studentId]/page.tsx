'use client'
import Link from 'next/link'
import { use, useRef, useState } from 'react'
import { useConfirm, useToast } from '@/components/Providers'
import { Avatar, Empty, Loading, Modal } from '@/components/ui'
import { useCoreQ } from '@/lib/data/core'
import { makeExamQ, useClassExams, useExamActions, useExamById, useSubmissionImages } from '@/lib/data/exams'
import { EXAM_STATUS, buildMessage, compressImage } from '@/lib/exams'
import { useMe } from '@/lib/me'
import { fmtDate } from '@/lib/utils'

const MAX_IMAGES = 5
type F = { key: string; score: number | ''; comment: string; note: string }

export default function SubmissionPage({ params }: { params: Promise<{ examId: string; studentId: string }> }) {
  const { examId, studentId } = use(params)
  const me = useMe()
  const toast = useToast()
  const confirm = useConfirm()
  const { ready, error, q } = useCoreQ()
  const examQ = useExamById(examId)
  const classId = examQ.data?.class_id ?? ''
  const data = useClassExams(classId)
  const act = useExamActions()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState('')
  const [zoom, setZoom] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [form, setForm] = useState<F | null>(null)
  const [msgEdit, setMsgEdit] = useState<{ key: string; text: string } | null>(null)

  const key = examId + '|' + studentId
  const sub = data.data?.subs.find((s) => s.exam_id === examId && s.student_id === studentId)
  const imgs = useSubmissionImages(sub?.id)

  if (!ready || examQ.isLoading || (classId && data.isLoading)) return <Loading error={error} />
  const exam = examQ.data, student = q.student(studentId), cls = q.klass(classId)
  if (!exam || !student || !cls || !data.data) return <Empty>Không tìm thấy bài làm.</Empty>

  const eq = makeExamQ(data.data, q.enrolled(classId))
  const f: F = form?.key === key ? form : { key, score: sub?.score ?? '', comment: sub?.comment ?? '', note: sub?.note ?? '' }
  const patch = (p: Partial<typeof f>) => setForm({ ...f, ...p })
  const images = imgs.data ?? []
  const status = eq.examStatus(examId, studentId)
  const [label, badge] = EXAM_STATUS[status]
  const ai = sub?.ai_result ?? null
  const hasScore = sub?.score != null
  const sent = eq.messagesOf(examId, studentId)

  const mates = q.enrolled(classId)
  const idx = mates.findIndex((s) => s.id === studentId)
  const prev = mates[idx - 1], next = mates[idx + 1]

  const built = buildMessage({ template: me.zaloTemplate, exam, student, subject: cls.subject_id ? q.subjectName(cls.subject_id) : cls.name, score: sub?.score ?? null, comment: sub?.comment ?? '', org: me.orgName })
  const msgText = msgEdit?.key === key + '|' + built ? msgEdit.text : built

  const addFiles = async (files: FileList | File[]) => {
    const list = [...files].filter((x) => x.type.startsWith('image/'))
    if (!list.length) return
    const room = MAX_IMAGES - images.length
    if (room <= 0) return toast(`Tối đa ${MAX_IMAGES} ảnh mỗi bài`)
    setBusy('upload')
    try {
      const blobs = await Promise.all(list.slice(0, room).map((x) => compressImage(x)))
      await act.addImages(examId, studentId, blobs, images.length)
    } catch { toast('Không đọc được ảnh') }
    setBusy('')
  }

  const runAi = async () => { setBusy('ai'); await act.aiGrade(exam, studentId, eq.avg(studentId), sub!.status); setBusy('') }
  const doApprove = async () => {
    if (f.score === '') return toast('Nhập điểm trước khi duyệt')
    if (f.score < 0 || f.score > exam.max_score) return toast(`Điểm phải từ 0 đến ${exam.max_score}`)
    setBusy('approve'); await act.approve(examId, studentId, f.score, f.comment, f.note); setBusy('')
  }
  const doSend = async () => {
    setBusy('zalo')
    const r = await act.sendZalo([{ examId, studentId, content: msgText }])
    setBusy('')
    if (r.ok) toast('Đã gửi Zalo (giả lập)')
  }

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Link className="text-indigo-600 mr-auto" href={`/exams/${examId}`}>← {exam.name}</Link>
        {prev && <Link className="border rounded px-2 py-1 bg-white text-xs" href={`/exams/${examId}/${prev.id}`}>‹ {prev.name.split(' ').pop()}</Link>}
        <span className="text-xs text-slate-400">{idx + 1}/{mates.length}</span>
        {next && <Link className="border rounded px-2 py-1 bg-white text-xs" href={`/exams/${examId}/${next.id}`}>{next.name.split(' ').pop()} ›</Link>}
      </div>
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={student.name} className="w-11 h-11 bg-indigo-100 text-indigo-700" />
        <div className="mr-auto min-w-0">
          <h1 className="page-title">{student.name}</h1>
          <div className="text-xs text-slate-500">{exam.name} · {fmtDate(exam.date)} · thang điểm {exam.max_score}</div>
        </div>
        <span className={`text-xs rounded-full px-2.5 py-1 whitespace-nowrap shrink-0 ${badge}`}>{label}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-3 items-start">
        {/* ẢNH BÀI LÀM */}
        <div className="bg-white rounded-lg shadow-sm p-3">
          <h2 className="font-semibold mb-2">Ảnh bài làm <span className="text-slate-400 font-normal text-xs">({images.length}/{MAX_IMAGES})</span></h2>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {images.map((img, i) => (
              <div key={img.id} className="relative group aspect-[3/4] rounded border overflow-hidden bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`Bài làm ${i + 1}`} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setZoom(img.url)} />
                <button className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100" aria-label="Xóa ảnh"
                  onClick={async () => (await confirm('Xóa ảnh này?')) && act.removeImage(img)}>✕</button>
              </div>
            ))}
          </div>
          <div className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer text-slate-500 ${drag ? 'border-indigo-500 bg-indigo-50' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}>
            <div className="text-2xl mb-1">📷</div>
            {busy === 'upload' ? 'Đang tải ảnh lên…' : 'Kéo thả ảnh vào đây, hoặc bấm để chọn / chụp ảnh'}
            <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
          </div>
          <p className="text-xs text-slate-400 mt-1">Ảnh được nén rồi lưu riêng tư trên máy chủ; chỉ người trong tổ chức xem được.</p>
        </div>

        <div className="space-y-3">
          {/* AI */}
          <div className="bg-white rounded-lg shadow-sm p-3">
            <div className="flex items-center mb-2">
              <h2 className="font-semibold mr-auto">AI chấm bài <span className="text-xs font-normal text-violet-600 bg-violet-100 rounded px-1.5 py-0.5 ml-1">giả lập</span></h2>
              <button disabled={!images.length || busy === 'ai'} className="bg-violet-600 text-white rounded px-3 py-1 text-xs disabled:opacity-40" onClick={runAi}>
                {busy === 'ai' ? 'Đang chấm…' : ai ? 'Chấm lại' : 'AI chấm bài'}
              </button>
            </div>
            {!images.length && <p className="text-xs text-slate-400">Hãy up ảnh bài làm để AI chấm.</p>}
            {busy === 'ai' && <div className="text-sm text-violet-600 animate-pulse py-3">AI đang đọc bài làm và đối chiếu đáp án…</div>}
            {ai && busy !== 'ai' && (
              <div className="text-sm space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-violet-700">{ai.score}</span><span className="text-slate-400">/{exam.max_score}</span>
                  <span className="text-xs text-slate-500 ml-auto">độ tin cậy {Math.round(ai.confidence * 100)}%</span>
                </div>
                <p>{ai.comment}</p>
                {ai.errors.length > 0 && <ul className="text-xs text-rose-700 list-disc pl-4">{ai.errors.map((er) => <li key={er}>{er}</li>)}</ul>}
                <button className="text-xs border rounded px-2 py-1 text-violet-700" onClick={() => patch({ score: ai.score, comment: ai.comment })}>Dùng kết quả này</button>
              </div>
            )}
          </div>

          {/* ĐIỂM */}
          <div className="bg-white rounded-lg shadow-sm p-3">
            <h2 className="font-semibold mb-2">Điểm &amp; nhận xét của giáo viên</h2>
            <div className="flex items-center gap-2 mb-2">
              <input type="number" step="0.25" min="0" max={exam.max_score} placeholder="Điểm" value={f.score}
                onChange={(e) => patch({ score: e.target.value === '' ? '' : +e.target.value })} className="border rounded px-2 py-1.5 w-24 text-center text-lg font-semibold" />
              <span className="text-slate-400">/ {exam.max_score}</span>
              {hasScore && <span className="text-xs text-emerald-600 ml-auto">Đã lưu: {sub!.score}</span>}
            </div>
            <label className="block mb-2"><span className="text-xs text-slate-500">Nhận xét (gửi cho phụ huynh)</span>
              <textarea rows={2} className="w-full border rounded px-2 py-1.5" value={f.comment} onChange={(e) => patch({ comment: e.target.value })} /></label>
            <label className="block mb-2"><span className="text-xs text-slate-500">Ghi chú riêng (không gửi đi)</span>
              <textarea rows={1} className="w-full border rounded px-2 py-1.5" value={f.note} onChange={(e) => patch({ note: e.target.value })} /></label>
            <button disabled={busy === 'approve'} className="bg-emerald-600 text-white rounded px-4 py-1.5 disabled:opacity-50" onClick={doApprove}>{busy === 'approve' ? 'Đang lưu…' : 'Duyệt & lưu điểm'}</button>
          </div>

          {/* ZALO */}
          <div className="bg-white rounded-lg shadow-sm p-3">
            <h2 className="font-semibold mb-2">Gửi Zalo cho phụ huynh <span className="text-xs font-normal text-teal-700 bg-teal-100 rounded px-1.5 py-0.5 ml-1">giả lập</span></h2>
            <div className="text-xs text-slate-500 mb-1">Người nhận: <b>{student.parent_name || '—'}</b> · {student.parent_phone || 'chưa có SĐT'}</div>
            <textarea rows={4} disabled={!hasScore} className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-slate-50" value={hasScore ? msgText : 'Duyệt và lưu điểm trước khi gửi tin.'}
              onChange={(e) => setMsgEdit({ key: key + '|' + built, text: e.target.value })} />
            <div className="flex items-center gap-2 mt-2">
              <button className="text-xs border rounded px-2 py-1 disabled:opacity-40" disabled={!hasScore} onClick={() => { navigator.clipboard?.writeText(msgText); toast('Đã copy tin nhắn') }}>Copy</button>
              <button disabled={!hasScore || busy === 'zalo'} className="ml-auto bg-teal-600 text-white rounded px-4 py-1.5 disabled:opacity-40" onClick={doSend}>
                {busy === 'zalo' ? 'Đang gửi…' : sent.length ? 'Gửi lại' : 'Gửi Zalo'}
              </button>
            </div>
            {sent.length > 0 && (
              <div className="mt-3 border-t pt-2">
                <div className="text-xs font-semibold text-slate-500 mb-1">Lịch sử gửi</div>
                {sent.map((m) => (
                  <div key={m.id} className="text-xs border-l-2 border-teal-500 pl-2 mb-2">
                    <div className="text-teal-700">✓ Đã gửi {fmtDate((m.sent_at ?? '').slice(0, 10))} qua Zalo</div>
                    <div className="text-slate-600">{m.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={!!zoom} onClose={() => setZoom(null)} maxW="md:max-w-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {zoom && <img src={zoom} alt="Bài làm" className="w-full h-auto rounded" />}
        <div className="text-right mt-2"><button className="px-3 py-1.5 rounded border" onClick={() => setZoom(null)}>Đóng</button></div>
      </Modal>
    </section>
  )
}
