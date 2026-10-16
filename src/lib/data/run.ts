'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useToast } from '@/components/Providers'

const friendly = (e: { message: string; code?: string }) => {
  if (e.code === '42501' || /row-level security|permission denied/i.test(e.message)) return 'Bạn không có quyền thực hiện thao tác này'
  if (e.code === '23505') return 'Dữ liệu đã tồn tại'
  if (e.code === '23503') return 'Dữ liệu đang được sử dụng ở nơi khác'
  return e.message
}

type Result<T> = PromiseLike<{ data: T; error: { message: string; code?: string } | null }>

/** Nhóm cache (tiền tố queryKey) bị ảnh hưởng khi ghi dữ liệu. Chỉ làm mới đúng nhóm liên quan. */
export const KEYS = {
  core: ['core'],
  catalog: ['core', 'fees'],                       // lớp, ghi danh: ảnh hưởng danh sách học phí
  exam: ['exams', 'exam', 'images'],
  everything: ['core', 'attendance', 'exams', 'exam', 'images', 'fees', 'events'], // xóa học sinh/lớp kéo theo nhiều bảng
} as const

/** Chạy một thao tác ghi: báo lỗi bằng toast, làm mới các nhóm cache liên quan khi thành công. */
export function useRun() {
  const qc = useQueryClient()
  const toast = useToast()
  return useCallback(async <T,>(op: () => Result<T>, keys: readonly string[], ok?: string) => {
    const r = await op()
    if (r.error) { toast('Lỗi: ' + friendly(r.error)); return { ok: false as const, data: null } }
    await Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })))
    if (ok) toast(ok)
    return { ok: true as const, data: r.data }
  }, [qc, toast])
}
