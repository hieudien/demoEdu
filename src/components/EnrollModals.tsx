'use client'
import { useMemo, useState } from 'react'
import { useCoreActions, useCoreQ } from '@/lib/data/core'
import { fold } from '@/lib/xlsx'
import { ClassSelect } from './ClassSelect'
import { Icon, Modal } from './ui'

/** Chọn nhiều học sinh để thêm vào một lớp (mở từ trang chi tiết lớp). */
export function PickStudentsModal({ classId, onClose }: { classId: string; onClose: () => void }) {
  const { q } = useCoreQ()
  const { enrollMany } = useCoreActions()
  const [search, setSearch] = useState('')
  const [noClass, setNoClass] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const candidates = useMemo(() => q.notEnrolled(classId), [q, classId])
  const shown = useMemo(() => {
    const s = fold(search)
    return candidates.filter((st) => (!s || fold(st.name + st.parent_name).includes(s) || st.parent_phone.includes(search.trim())) && (!noClass || q.studentClasses(st.id).length === 0))
  }, [candidates, search, noClass, q])
  const allShownPicked = shown.length > 0 && shown.every((s) => picked.has(s.id))

  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => setPicked((p) => { const n = new Set(p); shown.forEach((s) => (allShownPicked ? n.delete(s.id) : n.add(s.id))); return n })
  const submit = async () => { setBusy(true); const r = await enrollMany([...picked], classId); setBusy(false); if (r.ok) onClose() }

  return (
    <Modal open onClose={onClose} maxW="md:max-w-lg">
      <h2 className="font-bold text-base mb-3">Thêm học sinh vào lớp</h2>
      <div className="relative mb-2">
        <Icon name="search" className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên học sinh, phụ huynh, SĐT…" className="w-full border rounded pl-8 pr-2 py-1.5" />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs mb-2">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={allShownPicked} onChange={toggleAll} disabled={!shown.length} />Chọn tất cả ({shown.length})</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={noClass} onChange={(e) => setNoClass(e.target.checked)} />Chỉ em chưa có lớp</label>
        <span className="ml-auto text-slate-500">Đã chọn {picked.size}</span>
      </div>
      <div className="border rounded-lg max-h-[45vh] overflow-y-auto">
        {shown.map((st) => (
          <label key={st.id} className={`flex items-center gap-3 px-3 py-2 border-b last:border-0 hover:bg-slate-50 ${picked.has(st.id) ? 'bg-indigo-50' : ''}`}>
            <input type="checkbox" checked={picked.has(st.id)} onChange={() => toggle(st.id)} />
            <span className="flex-1 min-w-0">
              <span className="block font-medium truncate">{st.name}</span>
              <span className="block text-xs text-slate-500 truncate">{st.parent_name || '—'} · {st.parent_phone || 'chưa có SĐT'}</span>
            </span>
            <span className="text-[11px] text-slate-400 text-right max-w-32 truncate">{q.studentClasses(st.id).map((c) => c.name).join(', ') || 'chưa có lớp'}</span>
          </label>
        ))}
        {!shown.length && <div className="p-6 text-center text-slate-400">{candidates.length ? 'Không có học sinh nào khớp.' : 'Tất cả học sinh đã ở trong lớp này.'}</div>}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button className="px-3 py-1.5 rounded border" onClick={onClose}>Hủy</button>
        <button disabled={busy || !picked.size} className="px-4 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50" onClick={submit}>{busy ? 'Đang thêm…' : `Thêm ${picked.size} học sinh`}</button>
      </div>
    </Modal>
  )
}

/** Thêm các học sinh đã chọn (ở trang Học sinh) vào một lớp. */
export function AddToClassModal({ studentIds, onClose, onDone }: { studentIds: string[]; onClose: () => void; onDone: () => void }) {
  const { core, q } = useCoreQ()
  const { enrollMany } = useCoreActions()
  const [classId, setClassId] = useState('')
  const [busy, setBusy] = useState(false)

  const already = new Set(classId ? q.enrolled(classId).map((s) => s.id) : [])
  const eligible = studentIds.filter((id) => !already.has(id))

  const submit = async () => { setBusy(true); const r = await enrollMany(eligible, classId); setBusy(false); if (r.ok) { onDone(); onClose() } }
  return (
    <Modal open onClose={onClose} maxW="md:max-w-md">
      <h2 className="font-bold text-base mb-1">Thêm vào lớp</h2>
      <p className="text-sm text-slate-500 mb-3">{studentIds.length} học sinh đã chọn</p>
      <ClassSelect classes={core.classes} value={classId} onChange={setClassId} sub={(c) => `${q.schedule(c)} · ${q.enrolled(c.id).length} học sinh`} dot={(c) => q.color(c).dot} />
      {classId && <p className="text-xs text-slate-500 -mt-2 mb-3">{eligible.length === studentIds.length ? `Sẽ thêm cả ${eligible.length} học sinh.` : `Sẽ thêm ${eligible.length} học sinh, bỏ qua ${studentIds.length - eligible.length} em đã học lớp này.`}</p>}
      <div className="flex justify-end gap-2 mt-2">
        <button className="px-3 py-1.5 rounded border" onClick={onClose}>Hủy</button>
        <button disabled={busy || !classId || !eligible.length} className="px-4 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50" onClick={submit}>{busy ? 'Đang thêm…' : `Thêm ${eligible.length} học sinh`}</button>
      </div>
    </Modal>
  )
}
