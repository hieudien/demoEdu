/** Đọc/ghi Excel cho danh sách học sinh. exceljs nặng nên chỉ nạp khi người dùng bấm Nhập/Xuất. */
import { iso, pad } from './utils'

export type StudentRow = { name: string; dob: string; parent_name: string; parent_phone: string }
export const MAX_IMPORT_ROWS = 2000
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

/* ---------- chuẩn hóa / kiểm tra ---------- */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]/g, '')

/** '' hợp lệ; trả về null nếu sai định dạng */
export function normPhone(s: string): string | null {
  const raw = s.trim()
  if (!raw) return ''
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('84') && d.length === 11) d = '0' + d.slice(2)
  else if (d.length === 9 && !d.startsWith('0')) d = '0' + d // Excel hay làm mất số 0 đầu
  return /^0\d{9,10}$/.test(d) ? d : null
}

/** Nhận dd/mm/yyyy, d-m-yyyy hoặc yyyy-mm-dd. '' → ''; sai → null. Trả về yyyy-mm-dd */
export function normDob(s: string): string | null {
  const t = s.trim()
  if (!t) return ''
  let y: number, m: number, d: number
  let r = t.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/)
  if (r) { d = +r[1]; m = +r[2]; y = +r[3] } else {
    r = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (!r) return null
    y = +r[1]; m = +r[2]; d = +r[3]
  }
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  if (y < 1950 || dt.getTime() > Date.now()) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

export const dobToText = (iso: string | null | undefined) => (iso ? iso.split('-').reverse().join('/') : '')

/* ---------- đọc file ---------- */
const HEADERS: Record<string, keyof StudentRow> = {
  hoten: 'name', ten: 'name', hovaten: 'name', name: 'name', hocsinh: 'name', tenhocsinh: 'name',
  ngaysinh: 'dob', sinhnhat: 'dob', dob: 'dob', ns: 'dob',
  phuhuynh: 'parent_name', tenphuhuynh: 'parent_name', parent: 'parent_name', hotenphuhuynh: 'parent_name',
  sdt: 'parent_phone', sdtphuhuynh: 'parent_phone', dienthoai: 'parent_phone', sodienthoai: 'parent_phone', phone: 'parent_phone', sdtph: 'parent_phone',
}
const DEFAULT_ORDER: (keyof StudentRow)[] = ['name', 'dob', 'parent_name', 'parent_phone']

/** Đưa giá trị ô về chuỗi (ngày Excel → dd/mm/yyyy, số serial của cột ngày → dd/mm/yyyy) */
function cellText(v: unknown, col: keyof StudentRow): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return `${pad(v.getUTCDate())}/${pad(v.getUTCMonth() + 1)}/${v.getUTCFullYear()}` // exceljs trả ngày ở UTC
  if (typeof v === 'number') {
    if (col === 'dob' && v > 1 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000); return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}` }
    return String(v)
  }
  if (typeof v === 'object') {
    const o = v as { richText?: { text: string }[]; text?: string; result?: unknown }
    if (o.richText) return o.richText.map((x) => x.text).join('').trim()
    if (o.text !== undefined) return String(o.text).trim()
    if (o.result !== undefined) return cellText(o.result, col)
    return ''
  }
  return String(v).trim()
}

function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '')
  const delim = (src.split('\n', 1)[0].match(/;/g)?.length ?? 0) > (src.split('\n', 1)[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = [], cur = '', q = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (q) { if (c === '"') { if (src[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
    else if (c === '"') q = true
    else if (c === delim) { row.push(cur); cur = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = '' }
    else cur += c
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  return rows
}

/** Đọc file .xlsx / .csv thành các dòng học sinh (chưa kiểm tra hợp lệ). Ném lỗi có thông báo tiếng Việt. */
export async function parseStudentFile(file: File): Promise<StudentRow[]> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('File quá lớn (tối đa 5MB)')
  let table: unknown[][]
  if (/\.csv$/i.test(file.name)) table = parseCsv(await file.text())
  else if (/\.xlsx$/i.test(file.name)) {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await file.arrayBuffer())
    const ws = wb.worksheets[0]
    if (!ws) throw new Error('File không có trang tính nào')
    table = []
    ws.eachRow({ includeEmpty: false }, (row) => { table.push((row.values as unknown[]).slice(1)) })
  } else throw new Error('Chỉ nhận file .xlsx hoặc .csv')

  // dòng tiêu đề: dòng đầu tiên có ít nhất một tên cột quen thuộc; không có thì coi là không tiêu đề, theo thứ tự mặc định
  const headerIdx = table.findIndex((r) => r.some((c) => typeof c === 'string' && HEADERS[fold(c)]))
  const map: (keyof StudentRow | null)[] = headerIdx >= 0
    ? table[headerIdx].map((c) => (typeof c === 'string' ? HEADERS[fold(c)] ?? null : null))
    : DEFAULT_ORDER
  const body = table.slice(headerIdx + 1)
  const out: StudentRow[] = []
  for (const r of body) {
    const row: StudentRow = { name: '', dob: '', parent_name: '', parent_phone: '' }
    map.forEach((key, i) => { if (key) row[key] = cellText(r[i], key) })
    if (Object.values(row).some(Boolean)) out.push(row)
  }
  if (!out.length) throw new Error('Không tìm thấy dòng dữ liệu nào trong file')
  if (out.length > MAX_IMPORT_ROWS) throw new Error(`File có ${out.length} dòng, tối đa ${MAX_IMPORT_ROWS} dòng mỗi lần nhập`)
  return out
}

/* ---------- ghi file ---------- */
function download(buf: ArrayBuffer | Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([buf as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const COLUMNS = [
  { header: 'Họ tên', key: 'name', width: 28 }, { header: 'Ngày sinh', key: 'dob', width: 14 },
  { header: 'Phụ huynh', key: 'parent_name', width: 26 }, { header: 'SĐT phụ huynh', key: 'parent_phone', width: 16 },
]

async function workbook(extra: { header: string; key: string; width: number }[] = []) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Học sinh')
  ws.columns = [...COLUMNS, ...extra]
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFEFF' } }
  ws.getColumn('dob').numFmt = 'dd/mm/yyyy'
  ws.getColumn('parent_phone').numFmt = '@' // giữ số 0 đầu
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  return { wb, ws }
}

const toUtcDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)) }

export async function exportStudents(rows: (StudentRow & { classes: string })[], filename = `hoc-sinh-${iso(new Date())}.xlsx`) {
  const { wb, ws } = await workbook([{ header: 'Lớp đang học', key: 'classes', width: 36 }])
  rows.forEach((r) => ws.addRow({ ...r, dob: r.dob ? toUtcDate(r.dob) : null }))
  download(await wb.xlsx.writeBuffer(), filename)
}

export async function downloadStudentTemplate() {
  const { wb, ws } = await workbook()
  ws.addRow({ name: 'Nguyễn Văn An', dob: toUtcDate('2012-05-20'), parent_name: 'Nguyễn Văn Bình', parent_phone: '0912345678' })
  ws.addRow({ name: 'Trần Thị Mai', dob: toUtcDate('2011-11-03'), parent_name: 'Trần Văn Hùng', parent_phone: '0987654321' })
  const help = wb.addWorksheet('Hướng dẫn')
  help.columns = [{ width: 90 }]
  ;['Nhập mỗi học sinh một dòng ở trang "Học sinh", xóa 2 dòng ví dụ trước khi dùng.', 'Họ tên là bắt buộc. Các cột còn lại có thể để trống.',
    'Ngày sinh dạng dd/mm/yyyy (ví dụ 20/05/2012).', 'SĐT phụ huynh gồm 10–11 chữ số; nên đặt ô ở dạng Văn bản để không mất số 0 đầu.',
    `Mỗi lần nhập tối đa ${MAX_IMPORT_ROWS} dòng, file tối đa 5MB.`].forEach((t) => help.addRow([t]))
  download(await wb.xlsx.writeBuffer(), 'mau-nhap-hoc-sinh.xlsx')
}
