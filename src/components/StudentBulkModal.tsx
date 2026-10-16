'use client'
import { useMemo, useRef, useState } from 'react'
import { useCoreActions, useCoreQ } from '@/lib/data/core'
import { MAX_IMPORT_ROWS, downloadStudentTemplate, fold, normDob, normPhone, parseStudentFile, type StudentRow } from '@/lib/xlsx'
import { ClassSelect } from './ClassSelect'
import { useToast } from './Providers'
import { Icon, Modal } from './ui'

type Row = StudentRow & { k: number }
const FIELDS: { key: keyof StudentRow; label: string; placeholder: string; w: string }[] = [
  { key: 'name', label: 'Họ tên *', placeholder: 'Nguyễn Văn An', w: 'w-[30%]' },
  { key: 'dob', label: 'Ngày sinh', placeholder: 'dd/mm/yyyy', w: 'w-[16%]' },
  { key: 'parent_name', label: 'Phụ huynh', placeholder: 'Họ tên phụ huynh', w: 'w-[28%]' },
  { key: 'parent_phone', label: 'SĐT phụ huynh', placeholder: '09xxxxxxxx', w: 'w-[18%]' },
]
let seq = 0
const blankRow = (): Row => ({ k: ++seq, name: '', dob: '', parent_name: '', parent_phone: '' })
const isBlank = (r: StudentRow) => !r.name.trim() && !r.dob.trim() && !r.parent_name.trim() && !r.parent_phone.trim()

/** Thêm nhiều học sinh một lúc: nhập tay dạng bảng, dán nhiều dòng từ Excel, hoặc nhập từ file .xlsx/.csv. */
export function StudentBulkModal({ mode, defaultClassId = '', onClose }: { mode: 'manual' | 'import'; defaultClassId?: string; onClose: () => void }) {
  const { core, q } = useCoreQ()
  const { createStudents } = useCoreActions()
  const toast = useToast()
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 3 }, blankRow))
  const [manual, setManual] = useState(mode === 'manual')
  const [classId, setClassId] = useState(defaultClassId)
  const [skipDup, setSkipDup] = useState(true)
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [drag, setDrag] = useState(false)
  const [fileNote, setFileNote] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const existing = useMemo(() => new Set(core.students.map((s) => `${fold(s.name)}|${s.parent_phone}|${s.dob ?? ''}`)), [core.students])

  // trạng thái từng dòng: lỗi định dạng, trùng với học sinh đã có, trùng với dòng phía trên
  const state = useMemo(() => {
    const seen = new Set<string>()
    return rows.map((r) => {
      if (isBlank(r)) return { blank: true, errors: [] as string[], dup: '', phone: '', dob: '' }
      const errors: string[] = []
      if (!r.name.trim()) errors.push('Thiếu họ tên')
      const dob = normDob(r.dob); if (dob === null) errors.push('Ngày sinh sai (dd/mm/yyyy)')
      const phone = normPhone(r.parent_phone); if (phone === null) errors.push('SĐT không hợp lệ')
      let dup = ''
      if (!errors.length) {
        const key = `${fold(r.name)}|${phone}|${dob}`
        if (existing.has(key)) dup = 'Đã có trong hệ thống'
        else if (seen.has(key)) dup = 'Trùng dòng phía trên'
        seen.add(key)
      }
      return { blank: false, errors, dup, phone: phone ?? '', dob: dob ?? '' }
    })
  }, [rows, existing])

  const filled = state.filter((s) => !s.blank).length
  const errorCount = state.filter((s) => s.errors.length).length
  const dupCount = state.filter((s) => s.dup).length
  const ready = state.filter((s) => !s.blank && !s.errors.length && !(s.dup && skipDup)).length

  const update = (i: number, key: keyof StudentRow, v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: v } : r)))
  const addRows = (n = 5) => setRows((rs) => [...rs, ...Array.from({ length: n }, blankRow)])

  // dán nhiều dòng từ Excel/Sheets (cột phân cách bằng tab) vào từ ô đang đứng
  const onPaste = (e: React.ClipboardEvent, i: number, col: number) => {
    const text = e.clipboardData.getData('text')
    if (!/[\t\n]/.test(text.replace(/\n$/, ''))) return // dán một giá trị bình thường
    e.preventDefault()
    const lines = text.replace(/\r/g, '').replace(/\n+$/, '').split('\n').map((l) => l.split('\t'))
    if (lines.length > MAX_IMPORT_ROWS) return toast(`Dán tối đa ${MAX_IMPORT_ROWS} dòng một lần`)
    setRows((rs) => {
      const next = [...rs]
      lines.forEach((cells, li) => {
        while (next.length <= i + li) next.push(blankRow())
        const r = { ...next[i + li] }
        cells.forEach((c, ci) => { const f = FIELDS[col + ci]; if (f) r[f.key] = c.trim() })
        next[i + li] = r
      })
      return next
    })
  }

  const loadFile = async (file: File) => {
    setReading(true)
    try {
      const parsed = await parseStudentFile(file)
      setRows((rs) => [...rs.filter((r) => !isBlank(r)), ...parsed.map((p) => ({ ...p, k: ++seq }))])
      setFileNote(`Đã đọc ${parsed.length} dòng từ "${file.name}". Kiểm tra các dòng bên dưới rồi bấm Thêm.`)
      setManual(true)
    } catch (e) { toast('Lỗi: ' + (e as Error).message) }
    setReading(false)
  }

  const submit = async () => {
    const list = rows.flatMap((r, i) => {
      const s = state[i]
      return s.blank || s.errors.length || (s.dup && skipDup) ? [] : [{ name: r.name.trim(), dob: s.dob || null, parent_name: r.parent_name.trim(), parent_phone: s.phone }]
    })
    if (!list.length) return
    setBusy(true)
    const r = await createStudents(list, classId || undefined)
    setBusy(false)
    if (r.ok) { toast(`Đã thêm ${r.created} học sinh${classId ? ' và xếp vào lớp' : ''}`); onClose() }
  }

  const drop = (
    <div onClick={() => fileRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f) }}
      className={`border-2 border-dashed rounded-lg text-center cursor-pointer text-slate-500 hover:border-indigo-500 hover:bg-indigo-50/50 ${manual ? 'p-3' : 'p-10'} ${drag ? 'border-indigo-500 bg-indigo-50' : ''}`}>
      <Icon name="upload" className={`mx-auto text-slate-400 ${manual ? 'w-4 h-4' : 'w-8 h-8 mb-2'}`} />
      {reading ? 'Đang đọc file…' : manual ? 'Nhập từ file: kéo thả hoặc bấm để chọn file Excel (.xlsx) / CSV' : 'Kéo thả file Excel (.xlsx) hoặc CSV vào đây, hoặc bấm để chọn'}
      <input ref={fileRef} type="file" accept=".xlsx,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = '' }} />
    </div>
  )

  return (
    <Modal open onClose={onClose} maxW="md:max-w-5xl">
      <h2 className="font-bold text-base">{mode === 'import' ? 'Nhập học sinh từ Excel' : 'Thêm học sinh'}</h2>
      <p className="text-xs text-slate-500 mb-3">Nhập nhiều học sinh một lúc: gõ trực tiếp vào bảng, dán nhiều dòng từ Excel (Ctrl+V), hoặc chọn file.</p>

      {drop}
      <div className="flex flex-wrap items-center gap-3 mt-2 mb-3 text-xs">
        <button type="button" className="text-indigo-600 inline-flex items-center gap-1" onClick={() => downloadStudentTemplate()}><Icon name="download" className="w-3.5 h-3.5" />Tải file mẫu</button>
        {!manual && <button type="button" className="text-slate-500 underline" onClick={() => setManual(true)}>hoặc nhập tay</button>}
        {fileNote && <span className="text-emerald-700">{fileNote}</span>}
      </div>

      {manual && (
        <>
          <div className="border rounded-lg overflow-auto max-h-[42vh]">
            <table className="w-full text-sm table-fixed min-w-[640px]">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
                <tr><th className="w-8 !px-2">#</th>{FIELDS.map((f) => <th key={f.key} className={`${f.w} text-left`}>{f.label}</th>)}<th className="text-left">Trạng thái</th><th className="w-8" /></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const s = state[i]
                  return (
                    <tr key={r.k} className={`border-t ${s.errors.length ? 'bg-rose-50/60' : s.dup ? 'bg-amber-50/60' : ''}`}>
                      <td className="!px-2 text-xs text-slate-400">{i + 1}</td>
                      {FIELDS.map((f, col) => (
                        <td key={f.key} className="!py-1 !px-1">
                          <input value={r[f.key]} placeholder={f.placeholder} onChange={(e) => update(i, f.key, e.target.value)} onPaste={(e) => onPaste(e, i, col)}
                            className="w-full border rounded px-1.5 py-1 bg-white" />
                        </td>
                      ))}
                      <td className="text-xs !py-1">
                        {s.blank ? null : s.errors.length ? <span className="text-rose-600">{s.errors.join(', ')}</span>
                          : s.dup ? <span className="text-amber-700">{s.dup}{skipDup ? ' · bỏ qua' : ''}</span> : <span className="text-emerald-600">✓ Hợp lệ</span>}
                      </td>
                      <td className="!px-1 text-center">
                        <button type="button" aria-label="Xóa dòng" className="text-slate-300 hover:text-rose-600" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [blankRow()]))}>✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
            <button type="button" className="border rounded px-2 py-1" onClick={() => addRows(5)}>+ Thêm 5 dòng</button>
            <button type="button" className="border rounded px-2 py-1" onClick={() => setRows((rs) => { const k = rs.filter((r) => !isBlank(r)); return k.length ? k : [blankRow()] })}>Xóa dòng trống</button>
            {errorCount > 0 && <button type="button" className="border border-rose-300 text-rose-700 rounded px-2 py-1" onClick={() => setRows((rs) => rs.filter((_, i) => !state[i].errors.length))}>Xóa {errorCount} dòng lỗi</button>}
            {dupCount > 0 && <label className="flex items-center gap-1.5"><input type="checkbox" checked={skipDup} onChange={(e) => setSkipDup(e.target.checked)} />Bỏ qua {dupCount} dòng trùng</label>}
            <span className="ml-auto text-slate-500">{filled} dòng · {ready} sẽ được thêm{errorCount ? ` · ${errorCount} lỗi` : ''}</span>
          </div>
        </>
      )}

      <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <div className="text-xs text-slate-500 mb-1">Xếp vào lớp ngay sau khi thêm (tùy chọn)</div>
          <ClassSelect classes={core.classes} value={classId} onChange={setClassId} allowAll flush allLabel="Không xếp vào lớp nào"
            sub={(c) => `${q.schedule(c)} · ${q.enrolled(c.id).length} học sinh`} dot={(c) => q.color(c).dot} />
        </div>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded border" onClick={onClose}>Hủy</button>
          <button disabled={busy || ready === 0 || errorCount > 0} title={errorCount ? 'Sửa hoặc xóa các dòng lỗi trước' : undefined}
            className="px-4 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50" onClick={submit}>
            {busy ? 'Đang thêm…' : `Thêm ${ready} học sinh`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
