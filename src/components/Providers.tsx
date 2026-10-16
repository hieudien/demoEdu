'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Modal } from './ui'

type Confirm = (message: string, opts?: { ok?: string; danger?: boolean }) => Promise<boolean>
const ToastCtx = createContext<(m: string) => void>(() => {})
const ConfirmCtx = createContext<Confirm>(async () => false)
export const useToast = () => useContext(ToastCtx)
export const useConfirm = () => useContext(ConfirmCtx)

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 } } }))
  const [toast, setToast] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const flash = useCallback((m: string) => {
    setToast(m)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 2600)
  }, [])

  const [ask, setAsk] = useState<{ message: string; ok: string; danger: boolean; resolve: (v: boolean) => void } | null>(null)
  const confirm = useCallback<Confirm>((message, opts) => new Promise((resolve) =>
    setAsk({ message, ok: opts?.ok ?? 'Đồng ý', danger: opts?.danger ?? true, resolve })), [])
  const close = (v: boolean) => { ask?.resolve(v); setAsk(null) }

  return (
    <QueryClientProvider client={qc}>
      <ToastCtx.Provider value={flash}>
        <ConfirmCtx.Provider value={confirm}>
          {children}
          {toast && <div className="fixed top-14 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded px-4 py-2 z-50 no-print max-w-[90vw]">{toast}</div>}
          <Modal open={!!ask} onClose={() => close(false)} maxW="md:max-w-sm">
            <p className="mb-4">{ask?.message}</p>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1.5 rounded border" onClick={() => close(false)}>Hủy</button>
              <button className={`px-4 py-1.5 rounded text-white ${ask?.danger ? 'bg-rose-600' : 'bg-indigo-600'}`} onClick={() => close(true)}>{ask?.ok}</button>
            </div>
          </Modal>
        </ConfirmCtx.Provider>
      </ToastCtx.Provider>
    </QueryClientProvider>
  )
}
