import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Plus, ChevronLeft, ChevronRight, ChevronRight as RowChevron, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react'
import { listRequests, getStats } from '../lib/api'
import type { ReturnRequest, StatsResponse } from '../lib/api'
import { STATUSES, REASONS, STATUS_STYLES } from '../lib/constants'
import { StatusBadge, ErrorBanner, EmptyState, inputCls, labelCls } from '../components/ui'
import { formatDateTime } from '../lib/format'

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date created' },
  { value: 'updated_at', label: 'Last updated' },
  { value: 'customer_name', label: 'Customer name' },
  { value: 'status', label: 'Status' },
]

function pageWindow(page: number, totalPages: number): number[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const set = new Set([1, 2, page - 1, page, page + 1, totalPages - 1, totalPages])
  return [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b)
}

export default function RequestList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''
  const reason = searchParams.get('reason') || ''
  const sort = searchParams.get('sort') || 'created_at'
  const order = searchParams.get('order') || 'desc'
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.max(1, Number.parseInt(searchParams.get('page_size') || '10', 10) || 10)

  const [searchInput, setSearchInput] = useState(q)
  const [rows, setRows] = useState<ReturnRequest[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  // Keep the input in sync when filters are cleared elsewhere.
  useEffect(() => { setSearchInput(q) }, [q])

  // Debounced search: a request is only issued after 400ms of no typing.
  useEffect(() => {
    if (searchInput === q) return
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams)
      if (searchInput.trim()) next.set('q', searchInput.trim())
      else next.delete('q')
      next.set('page', '1')
      setSearchParams(next)
    }, 400)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    listRequests({ q, status, reason, sort, order, page, page_size: pageSize }, controller.signal)
      .then((res) => {
        setRows(res.data)
        setTotal(res.pagination.total)
        setTotalPages(res.pagination.total_pages)
        setError(null)
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to load requests.')
        setRows([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [q, status, reason, sort, order, page, pageSize, reloadTick])

  useEffect(() => {
    getStats().then(setStats).catch(() => setStats(null))
  }, [reloadTick])

  const update = (patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (resetPage) next.set('page', '1')
    setSearchParams(next)
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearchParams(new URLSearchParams())
  }

  const hasFilters = Boolean(q || status || reason)

  const toggleSort = (field: string) => {
    if (sort === field) update({ order: order === 'asc' ? 'desc' : 'asc' })
    else update({ sort: field, order: field === 'customer_name' ? 'asc' : 'desc' })
  }

  const sortIcon = (field: string) =>
    sort === field
      ? order === 'asc'
        ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
        : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
      : null

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const pages = pageWindow(page, totalPages)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900">Returns queue</h1>
          <p className="mt-1 text-sm text-stone-500">
            Search, filtering, sorting and pagination all run on the server in SQL.
          </p>
        </div>
        <Link to="/new" className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">
          <Plus className="h-4 w-4" aria-hidden="true" /> New request
        </Link>
      </div>

      {/* Status summary — click a card to filter */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <button
          type="button"
          onClick={() => update({ status: null })}
          className={`rounded-2xl border bg-white px-4 py-3 text-left shadow-sm transition hover:border-teal-600 ${!status ? 'border-teal-700 ring-1 ring-teal-700/30' : 'border-stone-200'}`}
        >
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500">All requests</span>
          <span className="mt-1 block font-display text-2xl font-bold text-stone-900">{stats ? stats.total : '…'}</span>
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => update({ status: status === s ? null : s })}
            aria-pressed={status === s}
            className={`rounded-2xl border bg-white px-4 py-3 text-left shadow-sm transition hover:border-teal-600 ${status === s ? 'border-teal-700 ring-1 ring-teal-700/30' : 'border-stone-200'}`}
          >
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[s].dot}`} aria-hidden="true" /> {s}
            </span>
            <span className="mt-1 block font-display text-2xl font-bold text-stone-900">{stats ? stats.by_status[s] : '…'}</span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div>
            <label htmlFor="search" className={labelCls}>Search</label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
              <input
                id="search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Customer, email, order ID or reference…"
                className={`${inputCls} pl-9`}
              />
            </div>
            <p className="mt-1 text-xs text-stone-400">Search runs 400ms after you stop typing — not on every keystroke.</p>
          </div>
          <div>
            <label htmlFor="status-filter" className={labelCls}>Status</label>
            <select id="status-filter" value={status} onChange={(e) => update({ status: e.target.value || null })} className={`${inputCls} mt-1.5`}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="reason-filter" className={labelCls}>Reason</label>
            <select id="reason-filter" value={reason} onChange={(e) => update({ reason: e.target.value || null })} className={`${inputCls} mt-1.5`}>
              <option value="">All reasons</option>
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-[13px] font-medium text-stone-600">Sort by</label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => update({ sort: e.target.value })}
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button type="button" onClick={() => update({ order: order === 'asc' ? 'desc' : 'asc' })} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm font-medium hover:bg-stone-50">
              {order === 'asc' ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />}
              {order === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-[13px] font-medium text-stone-600">Per page</label>
            <select id="page-size" value={pageSize} onChange={(e) => update({ page_size: e.target.value })} className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm">
              {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-50">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Clear search & filters
            </button>
          )}
          <p className="ml-auto text-sm text-stone-500" aria-live="polite">
            {loading ? 'Loading…' : total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-5">
          <ErrorBanner message={error} onRetry={() => setReloadTick((t) => t + 1)} />
        </div>
      )}

      {/* Results */}
      <div className="mt-5">
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading requests">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl border border-stone-200 bg-white" />
            ))}
          </div>
        ) : error ? null : rows.length === 0 ? (
          hasFilters ? (
            <EmptyState title="No requests match" message="Nothing matches this combination of search and filters. Try broadening the search or clearing a filter.">
              <button type="button" onClick={clearFilters} className="mt-5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
                Clear search & filters
              </button>
            </EmptyState>
          ) : (
            <EmptyState title="No return requests yet" message="The desk is clear. Create the first return or replacement request to get started." actionLabel="Create a request" actionTo="/new" />
          )
        ) : (
          <>
            {/* Table (tablet / desktop) */}
            <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Reference</th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      <button type="button" onClick={() => toggleSort('customer_name')} className="inline-flex items-center gap-1 uppercase hover:text-stone-800">Customer {sortIcon('customer_name')}</button>
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">Item</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Reason</th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      <button type="button" onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 uppercase hover:text-stone-800">Status {sortIcon('status')}</button>
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      <button type="button" onClick={() => toggleSort('created_at')} className="inline-flex items-center gap-1 uppercase hover:text-stone-800">Created {sortIcon('created_at')}</button>
                    </th>
                    <th scope="col" className="px-2 py-3"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-stone-100 last:border-0 hover:bg-teal-50/40">
                      <td className="px-4 py-3">
                        <Link to={`/requests/${r.id}`} className="font-mono text-[13px] font-semibold text-teal-800 hover:underline">{r.reference}</Link>
                        <span className="block font-mono text-xs text-stone-400">{r.order_id}</span>
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <span className="block truncate font-medium text-stone-900">{r.customer_name}</span>
                        <span className="block truncate text-xs text-stone-500">{r.customer_email}</span>
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <span className="block truncate text-stone-800">{r.item_name} <span className="text-stone-400">×{r.quantity}</span></span>
                        <span className="block font-mono text-xs text-stone-400">{r.item_sku}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-stone-700">{r.reason}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-stone-600">{formatDateTime(r.created_at)}</td>
                      <td className="px-2 py-3">
                        <Link to={`/requests/${r.id}`} aria-label={`Open ${r.reference}`} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 inline-block">
                          <RowChevron className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards (mobile) */}
            <div className="space-y-3 md:hidden">
              {rows.map((r) => (
                <Link key={r.id} to={`/requests/${r.id}`} className="block rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] font-semibold text-teal-800">{r.reference}</p>
                      <p className="mt-0.5 truncate font-medium text-stone-900">{r.customer_name}</p>
                      <p className="truncate text-xs text-stone-500">{r.customer_email}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                    <div><dt className="text-stone-400">Order</dt><dd className="font-mono text-stone-700">{r.order_id}</dd></div>
                    <div><dt className="text-stone-400">Reason</dt><dd className="text-stone-700">{r.reason}</dd></div>
                    <div className="col-span-2"><dt className="text-stone-400">Item</dt><dd className="truncate text-stone-700">{r.item_name} ×{r.quantity} <span className="font-mono text-xs text-stone-400">({r.item_sku})</span></dd></div>
                    <div className="col-span-2"><dt className="text-stone-400">Created</dt><dd className="text-stone-700">{formatDateTime(r.created_at)}</dd></div>
                  </dl>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="mt-5 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => update({ page: String(page - 1) }, false)}
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-40 hover:bg-stone-50"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Prev
                </button>
                {pages.map((n, i) => (
                  <span key={n} className="inline-flex items-center gap-1.5">
                    {i > 0 && pages[i - 1] !== n - 1 && <span className="px-1 text-stone-400">…</span>}
                    <button
                      type="button"
                      aria-current={n === page ? 'page' : undefined}
                      onClick={() => update({ page: String(n) }, false)}
                      className={`min-w-10 rounded-lg border px-3 py-2 text-sm font-medium ${n === page ? 'border-teal-700 bg-teal-700 text-white' : 'border-stone-300 bg-white hover:bg-stone-50'}`}
                    >
                      {n}
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => update({ page: String(page + 1) }, false)}
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-40 hover:bg-stone-50"
                >
                  Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  )
}
