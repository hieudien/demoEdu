'use client'
import Link from 'next/link'
import { useState } from 'react'
import { FormModal } from '@/components/FormModal'
import { useConfirm } from '@/components/Providers'
import { Empty, Loading } from '@/components/ui'
import { useCoreActions, useCoreQ } from '@/lib/data/core'
import type { Cls } from '@/lib/data/types'
import { useMe } from '@/lib/me'
import { vnd } from '@/lib/utils'

export default function ClassesPage() {
  const me = useMe()
  const { ready, error, core, q } = useCoreQ()
  const { remove } = useCoreActions()
  const confirm = useConfirm()
  const [form, setForm] = useState<{ item?: Cls } | null>(null)
  if (!ready) return <Loading error={error} />

  const del = async (c: Cls) => {
    if (await confirm(`Xóa lớp ${c.name}? Toàn bộ điểm danh, bài kiểm tra, điểm số và học phí của lớp cũng bị xóa.`)) await remove('classes', c.id)
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h1 className="page-title mr-auto">Lớp học</h1>
        <button className="bg-indigo-600 text-white rounded px-3 py-1" onClick={() => setForm({})}>+ Thêm lớp</button>
      </div>
      {!core.classes.length ? <Empty icon="📚">Chưa có lớp nào. Bấm &quot;+ Thêm lớp&quot; để tạo.</Empty> : (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500">
              <tr><th>Lớp</th>{me.isCenter && <th>Môn</th>}{me.isCenter && <th>Giáo viên</th>}<th>Lịch</th><th>Học phí</th><th>Sĩ số</th><th /></tr>
            </thead>
            <tbody>
              {core.classes.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="font-medium">{c.name}</td>
                  {me.isCenter && <td>{q.subjectName(c.subject_id)}</td>}
                  {me.isCenter && <td>{q.teacherName(c.teacher_id)}</td>}
                  <td><div>{q.schedule(c)}</div><div className="text-xs text-slate-500">{c.room}</div></td>
                  <td>{vnd(c.fee)}</td>
                  <td>{q.enrolled(c.id).length}</td>
                  <td className="text-right whitespace-nowrap">
                    <Link className="text-emerald-600 mr-2" href={`/classes/${c.id}`}>Học sinh</Link>
                    <button className="text-indigo-600 mr-2" onClick={() => setForm({ item: c })}>Sửa</button>
                    {me.isAdmin && <button className="text-rose-600" onClick={() => del(c)}>Xóa</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {form && <FormModal table="classes" item={form.item} onClose={() => setForm(null)} />}
    </section>
  )
}
