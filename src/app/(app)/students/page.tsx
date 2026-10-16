'use client'
import { useMemo, useState } from 'react'
import { AddToClassModal } from '@/components/EnrollModals'
import { FormModal } from '@/components/FormModal'
import { useConfirm, useToast } from '@/components/Providers'
import { StudentBulkModal } from '@/components/StudentBulkModal'
import { Empty, Icon, Loading } from '@/components/ui'
import { useCoreActions, useCoreQ } from '@/lib/data/core'
import type { Student } from '@/lib/data/types'
import { fmtDate } from '@/lib/utils'
import { exportStudents, fold } from '@/lib/xlsx'

export default function StudentsPage() {
  const { ready, error, core, q } = useCoreQ()
  const { remove } = useCoreActions()
  const confirm = useConfirm()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [edit, setEdit] = useState<Student | null>(null)
  const [bulk, setBulk] = useState<'manual' | 'import' | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [addToClass, setAddToClass] = useState(false)

  const list = useMemo(() => {
    const s = fold(search)
    return core ? core.students.filter((x) => !s || fold(x.name + x.parent_name).includes(s) || x.parent_phone.includes(search.trim())) : []
  }, [core, search])
  if (!ready) return <Loading error={error} />

  const allPicked = list.length > 0 && list.every((s) => picked.has(s.id))
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => setPicked((p) => { const n = new Set(p); list.forEach((s) => (allPicked ? n.delete(s.id) : n.add(s.id))); return n })

  const del = async (st: Student) => {
    if (await confirm(`Xóa học sinh ${st.name}? Toàn bộ điểm danh, điểm số, bài làm và học phí của em cũng bị xóa.`)) await remove('students', st.id)
  }
  const doExport = async () => {
    const rows = (picked.size ? list.filter((s) => picked.has(s.id)) : list).map((s) => ({
      name: s.name, dob: s.dob ?? '', parent_name: s.parent_name, parent_phone: s.parent_phone, classes: q.studentClasses(s.id).map((c) => c.name).join(', '),
    }))
    try { await exportStudents(rows); toast(`Đã xuất ${rows.length} học sinh`) } catch { toast('Lỗi: không xuất được file') }
  }

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h1 className="page-title mr-auto">Học sinh <span className="text-slate-400 text-sm font-normal">({list.length})</span></h1>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên / SĐT..." className="border rounded px-2 py-1 w-40 md:w-56 bg-white" />
        <button className="border rounded px-2.5 py-1 bg-white inline-flex items-center gap-1" onClick={() => setBulk('import')}><Icon name="upload" className="w-3.5 h-3.5" />Nhập Excel</button>
        <button className="border rounded px-2.5 py-1 bg-white inline-flex items-center gap-1 disabled:opacity-50" disabled={!list.length} onClick={doExport}><Icon name="download" className="w-3.5 h-3.5" />Xuất Excel</button>
        <button className="bg-indigo-600 text-white rounded px-3 py-1" onClick={() => setBulk('manual')}>+ Thêm học sinh</button>
      </div>

      {picked.size > 0 && (
        <div className="sticky top-14 z-10 flex flex-wrap items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 mb-3 text-sm">
          <span className="font-medium">Đã chọn {picked.size} học sinh</span>
          <button className="bg-indigo-600 text-white rounded px-3 py-1" onClick={() => setAddToClass(true)}>Thêm vào lớp…</button>
          <button className="border bg-white rounded px-3 py-1" onClick={doExport}>Xuất Excel</button>
          <button className="text-slate-500 underline ml-auto" onClick={() => setPicked(new Set())}>Bỏ chọn</button>
        </div>
      )}

      {!core.students.length ? <Empty icon="🎓">Chưa có học sinh. Bấm &quot;+ Thêm học sinh&quot; hoặc &quot;Nhập Excel&quot; để bắt đầu.</Empty> : (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500">
              <tr><th className="w-8"><input type="checkbox" aria-label="Chọn tất cả" checked={allPicked} onChange={toggleAll} /></th><th>Họ tên</th><th>Ngày sinh</th><th>Phụ huynh</th><th>Lớp</th><th /></tr>
            </thead>
            <tbody>
              {list.map((st) => (
                <tr key={st.id} className={`border-t ${picked.has(st.id) ? 'bg-indigo-50/60' : ''}`}>
                  <td><input type="checkbox" aria-label={`Chọn ${st.name}`} checked={picked.has(st.id)} onChange={() => toggle(st.id)} /></td>
                  <td className="font-medium">{st.name}</td>
                  <td>{fmtDate(st.dob ?? undefined)}</td>
                  <td><div>{st.parent_name}</div><div className="text-xs text-slate-500">{st.parent_phone}</div></td>
                  <td>{q.studentClasses(st.id).map((c) => <span key={c.id} className="inline-block bg-indigo-50 text-indigo-700 rounded px-1.5 mr-1 text-xs">{c.name}</span>)}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="text-indigo-600 mr-2" onClick={() => setEdit(st)}>Sửa</button>
                    <button className="text-rose-600" onClick={() => del(st)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && <div className="p-6 text-center text-slate-400">Không tìm thấy học sinh.</div>}
        </div>
      )}
      {edit && <FormModal table="students" item={edit} onClose={() => setEdit(null)} />}
      {bulk && <StudentBulkModal mode={bulk} onClose={() => setBulk(null)} />}
      {addToClass && <AddToClassModal studentIds={[...picked]} onClose={() => setAddToClass(false)} onDone={() => setPicked(new Set())} />}
    </section>
  )
}
