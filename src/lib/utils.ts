export const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseDate = (s: string) => new Date(s + 'T00:00:00')

export const WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
export const wd = (date: string) => WEEKDAYS[parseDate(date).getDay()]
export const vnd = (n: number) => (n || 0).toLocaleString('vi-VN') + ' đ'
export const fmtDate = (s?: string) => (s ? s.split('-').reverse().join('/') : '—')
export const initial = (n: string) => (n || '?').trim().split(/\s+/).pop()![0]
export const shiftMonth = (m: string, n: number) => {
  const [y, mo] = m.split('-').map(Number)
  return iso(new Date(y, mo - 1 + n, 1)).slice(0, 7)
}
export const shiftDay = (date: string, n: number) => {
  const d = parseDate(date)
  d.setDate(d.getDate() + n)
  return iso(d)
}

export const PALETTE = [
  { dot: 'bg-indigo-500', chip: 'bg-indigo-100 text-indigo-800' },
  { dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800' },
  { dot: 'bg-sky-500', chip: 'bg-sky-100 text-sky-800' },
  { dot: 'bg-violet-500', chip: 'bg-violet-100 text-violet-800' },
  { dot: 'bg-teal-500', chip: 'bg-teal-100 text-teal-800' },
  { dot: 'bg-orange-500', chip: 'bg-orange-100 text-orange-800' },
]

export const BANKS = ['MB', 'VCB', 'ACB', 'TCB', 'BIDV', 'VPB', 'TPB', 'ICB', 'STB']
