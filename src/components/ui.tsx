import { Link } from 'react-router-dom'
import { AlertCircle, Loader2, PackageSearch } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Status } from '../lib/api'
import { STATUS_STYLES } from '../lib/constants'

export const inputCls =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 disabled:bg-stone-100 disabled:text-stone-500'

export const labelCls = 'block text-[13px] font-medium text-stone-700'

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLES[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {status}
    </span>
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-teal-700" aria-hidden="true" />
      {label}
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, message, actionLabel, actionTo, children }: {
  title: string
  message: string
  actionLabel?: string
  actionTo?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
      <PackageSearch className="h-10 w-10 text-stone-300" aria-hidden="true" />
      <h2 className="mt-4 font-display text-xl font-semibold text-stone-900">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm text-stone-500">{message}</p>
      {children}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="mt-5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

export function Field({ label, error, hint, children }: {
  label: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-700" role="alert">{error}</p>}
    </div>
  )
}
