'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

/** Lớp đang chọn lưu trên URL (?class=…): tải lại hay quay lại trang vẫn giữ nguyên.
 *  Trang dùng hook này phải nằm trong <Suspense>. */
export function useClassParam(key = 'class'): [string, (id: string) => void] {
  const sp = useSearchParams()
  const router = useRouter()
  const path = usePathname()
  const set = useCallback((id: string) => {
    const p = new URLSearchParams(sp.toString())
    if (id) p.set(key, id); else p.delete(key)
    router.replace(p.size ? `${path}?${p}` : path, { scroll: false })
  }, [sp, router, path, key])
  return [sp.get(key) ?? '', set]
}
