'use client'
import { useQuery } from '@tanstack/react-query'
import { useMe } from '../me'
import { createClient } from '../supabase/client'
import { selectAll } from './paginate'
import { useRun } from './run'
import type { Core } from './core'
import type { Cls, Enrollment, Payment, Settings, Student } from './types'
import { iso } from '../utils'

export type FeeRow = { key: string; st: Student; c: Cls; p?: Payment }

const monthEnd = (period: string) => { const [y, m] = period.split('-').map(Number); return iso(new Date(y, m, 0)) }

/** Khoản thu học phí của một tháng: ghi danh có hiệu lực trong tháng × thanh toán đã ghi */
export function useFees(period: string) {
  const me = useMe()
  return useQuery({
    queryKey: ['fees', me.orgId, period],
    enabled: me.isAdmin,
    queryFn: async () => {
      const sb = createClient()
      const [enrollments, payments] = await Promise.all([
        selectAll<Enrollment>((a, b) => sb.from('enrollments').select('*').lte('start_date', monthEnd(period)).or(`end_date.is.null,end_date.gte.${period}-01`).order('id').range(a, b)),
        selectAll<Payment>((a, b) => sb.from('payments').select('*').eq('period', period).order('id').range(a, b)),
      ])
      return { enrollments, payments }
    },
  })
}

export function feeRows(core: Core, d: { enrollments: Enrollment[]; payments: Payment[] }, classId = '', search = ''): FeeRow[] {
  const q = search.trim().toLowerCase()
  const seen = new Set<string>()
  const rows: FeeRow[] = []
  d.enrollments.forEach((e) => {
    const key = e.student_id + '|' + e.class_id
    if (seen.has(key) || (classId && e.class_id !== classId)) return
    seen.add(key)
    const st = core.students.find((s) => s.id === e.student_id)
    const c = core.classes.find((x) => x.id === e.class_id)
    if (!st || !c || (q && !st.name.toLowerCase().includes(q))) return
    rows.push({ key, st, c, p: d.payments.find((p) => p.student_id === e.student_id && p.class_id === e.class_id) })
  })
  return rows.sort((a, b) => a.st.name.localeCompare(b.st.name, 'vi'))
}

export function feeTotals(rows: FeeRow[]) {
  const total = rows.reduce((s, r) => s + r.c.fee, 0)
  const paid = rows.reduce((s, r) => s + (r.p ? r.p.amount : 0), 0)
  return { total, paid, debt: Math.max(0, total - paid), pct: total ? Math.min(100, Math.round((paid / total) * 100)) : 0 }
}

export function useFeeActions() {
  const me = useMe()
  const sb = createClient()
  const run = useRun()
  return {
    pay: (r: FeeRow, period: string, method: 'cash' | 'bank') =>
      run(() => sb.from('payments').insert({ org_id: me.orgId, student_id: r.st.id, class_id: r.c.id, period, amount: r.c.fee, method, paid_at: iso(new Date()) }), ['fees'], 'Đã thu tiền'),
    unpay: (id: string) => run(() => sb.from('payments').delete().eq('id', id), ['fees'], 'Đã hoàn tác'),
  }
}

export function useOrgSettings() {
  const me = useMe()
  return useQuery({
    queryKey: ['settings', me.orgId],
    enabled: me.isAdmin,
    queryFn: async () => {
      const { data, error } = await createClient().from('org_settings').select('*').eq('org_id', me.orgId).single()
      if (error) throw error
      return data as Settings
    },
  })
}

export function useSettingsActions() {
  const me = useMe()
  const sb = createClient()
  const run = useRun()
  return { update: (patch: Partial<Pick<Settings, 'bank' | 'account' | 'account_name'>>) =>
    run(() => sb.from('org_settings').update(patch).eq('org_id', me.orgId), ['settings'], 'Đã lưu') }
}

/** Nội dung CK duy nhất theo học sinh + lớp + tháng, để webhook ngân hàng khớp tự động sau này */
export const payCode = (studentId: string, classId: string, period: string) =>
  ('HP' + studentId.replace(/-/g, '').slice(0, 8) + classId.replace(/-/g, '').slice(0, 6) + period.replace('-', '')).toUpperCase()

export const qrUrl = (s: Settings, code: string, amount: number) =>
  `https://img.vietqr.io/image/${s.bank}-${s.account}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(s.account_name)}`
