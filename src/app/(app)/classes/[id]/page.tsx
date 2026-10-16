'use client'
import Link from 'next/link'
import { use, useState } from 'react'
import { PickStudentsModal } from '@/components/EnrollModals'
import { useConfirm } from '@/components/Providers'
import { Empty, Loading } from '@/components/ui'
import { useCoreActions, useCoreQ } from '@/lib/data/core'
import { vnd } from '@/lib/utils'

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { ready, error, q } = useCoreQ()
  const { unenrollMany } = useCoreActions()
  const confirm = useConfirm()
  const [adding, setAdding] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  if (!ready) return <Loading error={error} />
  const c = q.klass(id)
  if (!c) return <Empty>Không tìm thấy lớp.</Empty>
  const members = q.enrolled(id)
  const allPicked = members.length > 0 && members.every((s) => picked.has(s.id))
  const toggle = (sid: string) => setPicked((p) => { const n = new Set(p); if (n.has(sid)) n.delete(sid); else n.add(sid); return n })

  const removePicked = async () => {
    const ids = [...picked]
    if (await confirm(`Rút ${ids.length} học sinh khỏi lớp ${c.name}?`, { ok: 'Rút khỏi lớp' }) && (await unenrollMany(ids, id)).ok) setPicked(new Set())
  }

  return (
    <section>
      <Link className="text-indigo-600 mb-2 inline-block" href="/classes">← Danh sách lớp</Link>
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h1 className="page-title">{c.name}</h1>
          <p className="text-slate-500">{q.schedule(c)} · {vnd(c.fee)}/tháng · {members.length} học sinh</p>
        </div>
        <button className="bg-indigo-600 text-white rounded px-3 py-1.5" onClick={() => setAdding(true)}>+ Thêm học sinh</button>
      </div>

      <div className="bg-white rounded-lg shadow-sm mt-3">
        {members.length > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 border-b bg-slate-50 text-xs text-slate-600 sticky top-12 z-10">
            <label className="flex items-center gap-2"><input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(members.map((s) => s.id)))} />{picked.size ? `Đã chọn ${picked.size}` : 'Chọn tất cả'}</label>
            {picked.size > 0 && <button className="ml-auto text-rose-600 font-medium" onClick={removePicked}>Rút {picked.size} học sinh khỏi lớp</button>}
          </div>
        )}
        {members.map((s) => (
          <label key={s.id} className={`flex items-center gap-3 px-3 py-2 border-b last:border-0 hover:bg-slate-50 ${picked.has(s.id) ? 'bg-indigo-50/60' : ''}`}>
            <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} />
            <span className="flex-1 min-w-0"><span className="font-medium">{s.name}</span><span className="text-xs text-slate-500 ml-2">{s.parent_phone}</span></span>
          </label>
        ))}
        {!members.length && <div className="p-8 text-center text-slate-400">Lớp chưa có học sinh. Bấm &quot;+ Thêm học sinh&quot; để chọn nhiều em cùng lúc.</div>}
      </div>
      {adding && <PickStudentsModal classId={id} onClose={() => setAdding(false)} />}
    </section>
  )
}
