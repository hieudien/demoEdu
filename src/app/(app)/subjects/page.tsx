'use client'
import { useState } from 'react'
import { FormModal } from '@/components/FormModal'
import { useConfirm } from '@/components/Providers'
import { Empty, Forbidden, Loading } from '@/components/ui'
import { useCoreActions, useCoreQ } from '@/lib/data/core'
import type { Subject } from '@/lib/data/types'
import { useMe } from '@/lib/me'

export default function SubjectsPage() {
  const me = useMe()
  const { ready, error, core } = useCoreQ()
  const { remove } = useCoreActions()
  const confirm = useConfirm()
  const [form, setForm] = useState<{ item?: Subject } | null>(null)
  if (!me.isCenter || !me.isAdmin) return <Forbidden />
  if (!ready) return <Loading error={error} />

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h1 className="page-title mr-auto">Môn học</h1>
        <button className="bg-indigo-600 text-white rounded px-3 py-1" onClick={() => setForm({})}>+ Thêm</button>
      </div>
      {!core.subjects.length ? <Empty icon="🏷️">Chưa có môn học.</Empty> : (
        <div className="bg-white rounded-lg shadow-sm">
          {core.subjects.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-3 py-2 border-b last:border-0">
              <div><span className="font-medium">{s.name}</span><span className="text-xs text-slate-500 ml-2">{core.classes.filter((c) => c.subject_id === s.id).length} lớp</span></div>
              <div>
                <button className="text-indigo-600 mr-2" onClick={() => setForm({ item: s })}>Sửa</button>
                <button className="text-rose-600" onClick={async () => (await confirm(`Xóa môn ${s.name}? Các lớp thuộc môn này sẽ không còn môn.`)) && remove('subjects', s.id)}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {form && <FormModal table="subjects" item={form.item} onClose={() => setForm(null)} />}
    </section>
  )
}
