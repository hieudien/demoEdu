'use client'
import Link from 'next/link'
import { Suspense, useMemo, useState } from 'react'
import { FormModal } from '@/components/FormModal'
import { useConfirm, useToast } from '@/components/Providers'
import { ClassSelect } from '@/components/ClassSelect'
import { Avatar, Empty, Loading, Modal, Tabs } from '@/components/ui'
import { useCoreActions, useCoreQ } from '@/lib/data/core'
import { makeExamQ, useClassExams, useExamActions } from '@/lib/data/exams'
import type { Exam } from '@/lib/data/types'
import { useMe } from '@/lib/me'
import { useClassParam } from '@/lib/useClassParam'
import { fmtDate } from '@/lib/utils'

type Row = { score: number | ''; comment: string }

const scoreCls = (v: number | null | undefined, max: number) => {
  if (v === undefined || v === null) return 'text-slate-300'
  const x = (v / max) * 10
  return x < 5 ? 'bg-rose-100 text-rose-700' : x >= 8 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
}

export default function GradesPage() {
  return <Suspense><Grades /></Suspense>
}

function Grades() {
  const me = useMe()
  const { ready, error, core, q } = useCoreQ()
  const [cid, setCid] = useClassParam()
  const [tab, setTab] = useState<'matrix' | 'enter'>('matrix')
  const [examId, setExamId] = useState('')
  const [studentId, setStudentId] = useState<string | null>(null)
  const [examForm, setExamForm] = useState<{ item?: Exam } | null>(null)
  const [saving, setSaving] = useState(false)
  const data = useClassExams(cid)
  const act = useExamActions()
  const { remove } = useCoreActions()
  const confirm = useConfirm()
  const toast = useToast()

  const students = useMemo(() => (ready && cid ? q.enrolled(cid) : []), [ready, q, cid])
  const eq = useMemo(() => (data.data ? makeExamQ(data.data, students) : null), [data.data, students])
  const exams = data.data?.exams ?? []
  const exam = exams.find((e) => e.id === examId)

  const [draft, setDraft] = useState<{ key: string; rows: Record<string, Row> }>({ key: '', rows: {} })
  const rows = useMemo(() => {
    if (draft.key === examId) return draft.rows
    const m: Record<string, Row> = {}
    students.forEach((s) => { const r = eq?.submissionOf(examId, s.id); m[s.id] = { score: r?.score ?? '', comment: r?.comment ?? '' } })
    return m
  }, [draft, examId, students, eq])

  if (!ready) return <Loading error={error} />
  const setRow = (sid: string, patch: Partial<Row>) => setDraft({ key: examId, rows: { ...rows, [sid]: { ...rows[sid], ...patch } } })

  const save = async () => {
    if (!exam) return
    if (Object.values(rows).some((v) => v.score !== '' && (v.score < 0 || v.score > exam.max_score))) return toast('Điểm phải từ 0 đến ' + exam.max_score)
    setSaving(true); await act.saveScores(exam.id, rows); setSaving(false)
    setDraft({ key: '', rows: {} })
  }
  const enterExam = (id: string) => { setExamId(id); setTab('enter') }
  const delExam = async () => {
    if (!exam || !(await confirm(`Xóa bài "${exam.name}" cùng toàn bộ điểm và bài làm của bài này?`))) return
    if ((await remove('exams', exam.id)).ok) setExamId('')
  }
  const sg = studentId && eq ? eq.studentGrades(studentId) : null
  const stu = studentId ? q.student(studentId) : null

  return (
    <section>
      <h1 className="page-title mb-1">Điểm số &amp; nhận xét</h1>
      <p className="text-slate-500 mb-3">Chọn lớp để xem bảng điểm hoặc nhập điểm cho từng bài kiểm tra.</p>
      <ClassSelect classes={core.classes} value={cid} onChange={(id) => { setCid(id); setExamId(''); setTab('matrix') }}
        sub={(c) => `${q.enrolled(c.id).length} học sinh`} dot={(c) => q.color(c).dot} teacherOf={me.isCenter && me.isAdmin ? (c) => q.teacherName(c.teacher_id) : undefined} />
      {!core.classes.length && <Empty icon="📚">Chưa có lớp nào. Hãy tạo lớp ở mục Lớp học.</Empty>}

      {!cid ? (core.classes.length > 0 && <Empty icon="👆">Hãy chọn lớp</Empty>) : data.isLoading ? <Loading /> : (
        <div>
          <Tabs value={tab} onChange={setTab} tabs={[['matrix', 'Bảng điểm'], ['enter', 'Nhập điểm theo bài']]}
            right={<button className="bg-indigo-600 text-white rounded px-3 py-1" onClick={() => setExamForm({})}>+ Bài kiểm tra</button>} />

          {tab === 'matrix' && (exams.length && eq ? (
            <div>
              <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
                <table className="text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="sticky left-0 bg-slate-50 z-10 min-w-40">Học sinh</th><th className="text-center">TB</th>
                      {exams.map((e, i) => (
                        <th key={e.id} className="!px-1 text-center cursor-pointer hover:bg-indigo-50 min-w-12" title={`${e.name} · ${fmtDate(e.date)}`} onClick={() => enterExam(e.id)}>
                          <div>#{i + 1}</div><div className="font-normal text-[10px]">{e.date.slice(8)}/{e.date.slice(5, 7)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {eq.gradeMatrix().map((row) => (
                      <tr key={row.st.id} className="border-t">
                        <td className="sticky left-0 bg-white z-10 font-medium text-sm cursor-pointer hover:text-indigo-600" onClick={() => setStudentId(row.st.id)}>{row.st.name}</td>
                        <td className="text-center"><span className={`rounded px-1.5 py-0.5 font-semibold ${scoreCls(row.avg, 10)}`}>{row.avg === null ? '—' : row.avg.toFixed(1)}</span></td>
                        {row.cells.map((cell) => (
                          <td key={cell.e.id} className="!px-1 text-center cursor-pointer" title={cell.r?.comment} onClick={() => enterExam(cell.e.id)}>
                            <span className={`inline-block min-w-8 rounded px-1 py-0.5 ${scoreCls(cell.r?.score, cell.e.max_score)}`}>{cell.r && cell.r.score !== null ? cell.r.score : '·'}</span>
                            {cell.r?.comment && <span className="block text-[9px] leading-3">💬</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!students.length && <div className="p-6 text-center text-slate-400">Lớp chưa có học sinh.</div>}
              </div>
              <p className="text-xs text-slate-400 mt-2">Bấm tên học sinh để xem chi tiết điểm và nhận xét; bấm số bài hoặc ô điểm để nhập/sửa điểm bài đó. Màu: xanh ≥ 8, đỏ &lt; 5.</p>
            </div>
          ) : <Empty>Lớp chưa có bài kiểm tra. Bấm &quot;+ Bài kiểm tra&quot; để tạo.</Empty>)}

          {tab === 'enter' && (
            <div>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                {[...exams].reverse().map((e) => (
                  <button key={e.id} className={`shrink-0 rounded-lg border px-3 py-2 text-left bg-white ${examId === e.id ? 'border-indigo-600 ring-2 ring-indigo-200' : ''}`} onClick={() => setExamId(e.id)}>
                    <div className="font-semibold text-xs">#{exams.findIndex((x) => x.id === e.id) + 1} · {e.date.slice(8)}/{e.date.slice(5, 7)}</div>
                    <div className="text-xs text-slate-500 max-w-32 truncate">{e.name}</div>
                  </button>
                ))}
              </div>
              {!exam ? <Empty>Hãy chọn bài kiểm tra ở trên</Empty> : (
                <div>
                  <div className="bg-white rounded-lg shadow-sm">
                    <div className="flex justify-between items-center px-3 py-2 border-b bg-slate-50 text-xs text-slate-500">
                      <span>{exam.name} · {fmtDate(exam.date)} · thang điểm {exam.max_score}</span>
                      <span><Link className="text-emerald-600 mr-2" href={`/exams/${exam.id}`}>Bài làm &amp; Zalo →</Link><button className="text-indigo-600 mr-2" onClick={() => setExamForm({ item: exam })}>Sửa</button><button className="text-rose-600" onClick={delExam}>Xóa</button></span>
                    </div>
                    {students.map((s) => rows[s.id] && (
                      <div key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-2 border-b last:border-0">
                        <Avatar name={s.name} className="w-8 h-8 bg-indigo-100 text-indigo-700 text-xs" />
                        <span className="font-medium w-40">{s.name}</span>
                        <input type="number" step="0.25" min="0" max={exam.max_score} placeholder="Điểm" value={rows[s.id].score}
                          onChange={(e) => setRow(s.id, { score: e.target.value === '' ? '' : +e.target.value })} className="border rounded px-2 py-1 w-20 text-center" />
                        <input placeholder="Nhận xét..." value={rows[s.id].comment} onChange={(e) => setRow(s.id, { comment: e.target.value })} className="border rounded px-2 py-1 flex-1 min-w-48" />
                      </div>
                    ))}
                    {!students.length && <div className="p-6 text-center text-slate-400">Lớp chưa có học sinh.</div>}
                  </div>
                  {students.length > 0 && (
                    <div className="sticky bottom-16 md:bottom-3 z-10 mt-3 bg-white rounded-lg shadow-lg border p-2 flex justify-end">
                      <button disabled={saving} className="bg-indigo-600 text-white rounded px-4 py-1.5 disabled:opacity-50" onClick={save}>{saving ? 'Đang lưu…' : 'Lưu điểm & nhận xét'}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Modal open={!!(studentId && stu && sg)} onClose={() => setStudentId(null)} maxW="md:max-w-lg">
        {stu && sg && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={stu.name} className="w-10 h-10 bg-indigo-100 text-indigo-700" />
              <div className="flex-1"><div className="font-bold">{stu.name}</div><div className="text-xs text-slate-500">{q.klass(cid)?.name}</div></div>
              <button className="text-slate-400 text-xl" onClick={() => setStudentId(null)}>✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div className="bg-slate-50 rounded p-2"><div className="text-xs text-slate-500">Điểm TB</div><div className="font-bold">{sg.avg === null ? '—' : sg.avg.toFixed(2)}</div></div>
              <div className="bg-slate-50 rounded p-2"><div className="text-xs text-slate-500">Cao nhất</div><div className="font-bold text-emerald-600">{sg.best ?? '—'}</div></div>
              <div className="bg-slate-50 rounded p-2"><div className="text-xs text-slate-500">Thấp nhất</div><div className="font-bold text-rose-600">{sg.low ?? '—'}</div></div>
            </div>
            {sg.rows.map((row) => (
              <div key={row.e.id} className="border-t py-2 flex gap-3">
                <span className={`w-12 text-center shrink-0 rounded px-1 py-1 font-semibold self-start ${scoreCls(row.r?.score, row.e.max_score)}`}>{row.r && row.r.score !== null ? row.r.score : '—'}</span>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">#{row.no} · {row.e.name} · {fmtDate(row.e.date)}</div>
                  <div className={`text-sm ${row.r?.comment ? '' : 'text-slate-300'}`}>{row.r?.comment || '(chưa có nhận xét)'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {examForm && <FormModal table="exams" item={examForm.item} defaults={{ class_id: cid }} onClose={() => setExamForm(null)}
        onSaved={(id) => { if (!examForm.item && id) { setExamId(id); setTab('enter') } }} />}
    </section>
  )
}
