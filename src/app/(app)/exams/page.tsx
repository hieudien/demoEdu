'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import { FormModal } from '@/components/FormModal'
import { ClassSelect } from '@/components/ClassSelect'
import { Empty, Loading } from '@/components/ui'
import { useCoreQ } from '@/lib/data/core'
import { makeExamQ, useClassExams } from '@/lib/data/exams'
import { useMe } from '@/lib/me'
import { useClassParam } from '@/lib/useClassParam'
import { fmtDate } from '@/lib/utils'

export default function ExamsPage() {
  return <Suspense><Exams /></Suspense>
}

function Exams() {
  const { ready, error, core, q } = useCoreQ()
  const router = useRouter()
  const me = useMe()
  const [cid, setCid] = useClassParam()
  const [form, setForm] = useState(false)
  const data = useClassExams(cid)
  if (!ready) return <Loading error={error} />

  const valid = core.classes.some((c) => c.id === cid)
  const eq = data.data && valid ? makeExamQ(data.data, q.enrolled(cid)) : null
  const exams = data.data && valid ? [...data.data.exams].reverse() : []

  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <h1 className="page-title mr-auto">Bài kiểm tra</h1>
        {valid && <button className="bg-indigo-600 text-white rounded px-3 py-1" onClick={() => setForm(true)}>+ Bài kiểm tra</button>}
      </div>
      <p className="text-slate-500 mb-3">Lưu bài làm từng học sinh, nhờ AI chấm và gửi kết quả cho phụ huynh qua Zalo.</p>
      <ClassSelect classes={core.classes} value={cid} onChange={setCid}
        sub={(c) => `${q.enrolled(c.id).length} học sinh`} dot={(c) => q.color(c).dot} teacherOf={me.isCenter && me.isAdmin ? (c) => q.teacherName(c.teacher_id) : undefined} />
      {!core.classes.length && <Empty icon="📚">Chưa có lớp nào. Hãy tạo lớp ở mục Lớp học.</Empty>}

      {!valid ? (core.classes.length > 0 && <Empty icon="👆">Hãy chọn lớp</Empty>) : data.isLoading ? <Loading /> : (
        <div className="space-y-2">
          {exams.map((e) => {
            const st = eq!.examStats(e.id)
            return (
              <Link key={e.id} href={`/exams/${e.id}`} className="block bg-white rounded-lg shadow-sm p-3 hover:ring-2 hover:ring-indigo-200">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="mr-auto min-w-40">
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-xs text-slate-500">{fmtDate(e.date)} · thang điểm {e.max_score}{e.brief ? ' · có đề/đáp án' : ''}</div>
                  </div>
                  <Chip cls="bg-slate-100 text-slate-700" n={`${st.scored}/${st.total}`} t="có điểm" />
                  {st.uploaded > 0 && <Chip cls="bg-sky-100 text-sky-700" n={st.uploaded} t="chờ AI chấm" />}
                  {st.ai > 0 && <Chip cls="bg-violet-100 text-violet-700" n={st.ai} t="chờ duyệt" />}
                  {st.approved > 0 && <Chip cls="bg-emerald-100 text-emerald-700" n={st.approved} t="chưa gửi Zalo" />}
                  {st.sent > 0 && <Chip cls="bg-teal-100 text-teal-700" n={st.sent} t="đã gửi Zalo" />}
                </div>
              </Link>
            )
          })}
          {!exams.length && <Empty>Lớp chưa có bài kiểm tra. Bấm &quot;+ Bài kiểm tra&quot; để tạo.</Empty>}
        </div>
      )}
      {form && <FormModal table="exams" defaults={{ class_id: cid }} onClose={() => setForm(false)} onSaved={(id) => id && router.push(`/exams/${id}`)} />}
    </section>
  )
}

function Chip({ cls, n, t }: { cls: string; n: React.ReactNode; t: string }) {
  return <span className={`text-xs rounded-full px-2 py-0.5 ${cls}`}><b>{n}</b> {t}</span>
}
