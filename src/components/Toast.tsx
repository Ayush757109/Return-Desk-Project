import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

interface ToastItem {
  id: number
  kind: 'success' | 'error'
  message: string
}

interface ToastCtx {
  success: (message: string) => void
  error: (message: string) => void
}

const Ctx = createContext<ToastCtx>({ success: () => {}, error: () => {} })

export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const push = useCallback((kind: 'success' | 'error', message: string) => {
    const id = nextId.current++
    setToasts((prev) => [...prev.slice(-3), { id, kind, message }])
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5200)
  }, [])

  const success = useCallback((m: string) => push('success', m), [push])
  const error = useCallback((m: string) => push('error', m), [push])

  return (
    <Ctx.Provider value={{ success, error }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-4 sm:w-96" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm shadow-lg ring-1 ${
              t.kind === 'success'
                ? 'bg-teal-800 text-white ring-teal-900/30'
                : 'bg-rose-700 text-white ring-rose-900/30'
            }`}
            role={t.kind === 'error' ? 'alert' : 'status'}
          >
            {t.kind === 'success'
              ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
            <p className="min-w-0 flex-1 leading-snug">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="shrink-0 rounded p-0.5 opacity-80 hover:opacity-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
