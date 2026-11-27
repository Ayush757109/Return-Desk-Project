import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Loader2, Check, X, Play, BadgeCheck, Ban, Trash2,
  MessageSquarePlus, Mail, Phone, Lock,
} from 'lucide-react'
import {
  getRequest, listNotes, updateRequest, deleteRequest, transitionRequest, addNote, ApiError,
} from '../lib/api'
import type { ReturnRequest, ReturnNote, Status, Resolution } from '../lib/api'
import { REASONS, RESOLUTIONS, TRANSITIONS, EDITABLE_STATUSES, REMOVABLE_STATUSES, STATUS_STYLES } from '../lib/constants'
import { StatusBadge, ErrorBanner, EmptyState, Field, Spinner, inputCls } from '../components/ui'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { formatDateTime, formatMoney } from '../lib/format'

type ModalKind = 'approve' | 'reject' | 'complete' | 'remove' | null

function LifecycleSteps({ status }: { status: Status }) {
  if (status === 'Rejected') {
    return (
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium" aria-label="Lifecycle">
        <li className="rounded-full bg-stone-200 px-2.5 py-1 text-stone-600">Open</li>
        <li aria-hidden="true" className="text-stone-300">→</li>
        <li className="rounded-full bg-stone-200 px-2.5 py-1 text-stone-600">In Review</li>
        <li aria-hidden="true" className="text-stone-300">→</li>
        <li className="rounded-full bg-rose-600 px-2.5 py-1 text-white">Rejected · final</li>
      </ol>
    )
  }
  const steps: Status[] = ['Open', 'In Review', 'Approved', 'Completed']
  const currentIdx = steps.indexOf(status)
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium" aria-label="Lifecycle">
      {steps.map((step, i) => (
        <li key={step} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true" className="text-stone-300">→</span>}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
            i < currentIdx ? 'bg-stone-200 text-stone-600' : i === currentIdx ? 'bg-teal-700 text-white' : 'bg-stone-100 text-stone-400'
          }`}>
            {i < currentIdx && <Check className="h-3 w-3" aria-hidden="true" />}
            {step}{step === 'Completed' && i === currentIdx ? ' · final' : ''}
          </span>
        </li>
      ))}
    </ol>
  )
}

export default function RequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [req, setReq] = useState<ReturnRequest | null>(null)
  const [notes, setNotes] = useState<ReturnNote[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalKind>(null)
  const [approveResolution, setApproveResolution] = useState<Resolution>('Refund')
  const [approveAmount, setApproveAmount] = useState('')
  const [approveErrors, setApproveErrors] = useState<Record<string, string>>({})

  const [noteAuthor, setNoteAuthor] = useState('Support Agent')
  const [noteBody, setNoteBody] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const [addingNote, setAddingNote] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [r, n] = await Promise.all([getRequest(id), listNotes(id)])
      setReq(r)
      setNotes(n)
      setNotFound(false)
      setLoadError(null)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true)
        setReq(null)
      } else {
        setLoadError(err instanceof Error ? err.message : 'Failed to load this request.')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const reloadNotes = async () => {
    if (!id) return
    try { setNotes(await listNotes(id)) } catch { /* notes refresh is best-effort; main load surfaces errors */ }
  }

  const handleActionError = async (err: unknown) => {
    const message = err instanceof Error ? err.message : 'Something went wrong.'
    setActionError(message)
    toast.error(message)
    if (err instanceof ApiError && (err.code === 'STATUS_CHANGED' || err.code === 'ILLEGAL_TRANSITION')) {
      await load()
    }
  }

  const doTransition = async (to: Status, extra?: { resolution?: Resolution; refund_amount?: number | null }, busyKey: string = to) => {
    if (!req) return
    setBusy(busyKey)
    setActionError(null)
    try {
      const updated = await transitionRequest(req.id, { to, expected_status: req.status, ...extra })
      setReq(updated)
      setModal(null)
      toast.success(`${updated.reference} is now ${updated.status}.`)
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = err.fieldErrors()
        if (Object.keys(fields).length > 0) setApproveErrors(fields)
      }
      await handleActionError(err)
    } finally {
      setBusy(null)
    }
  }

  const startEdit = () => {
    if (!req) return
    setEditForm({
      customer_name: req.customer_name,
      customer_email: req.customer_email,
      customer_phone: req.customer_phone || '',
      order_id: req.order_id,
      item_name: req.item_name,
      item_sku: req.item_sku,
      quantity: String(req.quantity),
      reason: req.reason,
    })
    setEditErrors({})
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!req) return
    setSavingEdit(true)
    setActionError(null)
    try {
      const updated = await updateRequest(req.id, {
        customer_name: editForm.customer_name.trim(),
        customer_email: editForm.customer_email.trim(),
        customer_phone: editForm.customer_phone.trim() || null,
        order_id: editForm.order_id.trim(),
        item_name: editForm.item_name.trim(),
        item_sku: editForm.item_sku.trim(),
        quantity: Number(editForm.quantity),
        reason: editForm.reason,
      })
      setReq(updated)
      setEditing(false)
      toast.success('Request details saved.')
    } catch (err) {
      if (err instanceof ApiError) setEditErrors(err.fieldErrors())
      await handleActionError(err)
    } finally {
      setSavingEdit(false)
    }
  }

  const doRemove = async () => {
    if (!req) return
    setBusy('remove')
    setActionError(null)
    try {
      await deleteRequest(req.id)
      toast.success(`${req.reference} has been removed from the desk (soft-deleted — the record is kept in the database).`)
      navigate('/queue')
    } catch (err) {
      setModal(null)
      await handleActionError(err)
    } finally {
      setBusy(null)
    }
  }

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!req) return
    if (!noteBody.trim()) {
      setNoteError('Note text is required.')
      return
    }
    setAddingNote(true)
    setNoteError(null)
    try {
      await addNote(req.id, { author: noteAuthor.trim() || 'Support Agent', body: noteBody.trim() })
      setNoteBody('')
      await reloadNotes()
      toast.success('Note added.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not add the note.'
      setNoteError(message)
      toast.error(message)
    } finally {
      setAddingNote(false)
    }
  }

  if (loading) return <Spinner label="Loading request…" />
  if (notFound) {
    return (
      <EmptyState
        title="Request not found"
        message="This request does not exist, or it was removed from the desk. Removed requests stay in the database but are hidden from the queue and cannot be opened."
        actionLabel="Back to queue"
        actionTo="/queue"
      />
    )
  }
  if (loadError || !req) return <ErrorBanner message={loadError || 'Failed to load this request.'} onRetry={load} />

  const allowed = TRANSITIONS[req.status]
  const canEdit = EDITABLE_STATUSES.includes(req.status)
  const canRemove = REMOVABLE_STATUSES.includes(req.status)
  const isFinal = allowed.length === 0

  return (
    <div>
      <Link to="/queue" className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-800 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to queue
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{req.reference}</h1>
            <StatusBadge status={req.status} />
          </div>
          <p className="mt-1 text-sm text-stone-500">{STATUS_STYLES[req.status].blurb}</p>
          <p className="mt-1 text-xs text-stone-400">
            Created {formatDateTime(req.created_at)} · Updated {formatDateTime(req.updated_at)}
          </p>
        </div>
        <LifecycleSteps status={req.status} />
      </div>

      {actionError && (
        <div className="mt-4">
          <ErrorBanner message={actionError} />
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Main column */}
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" aria-label="Request details">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-stone-900">Request details</h2>
              {!editing && canEdit && (
                <button type="button" onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-50">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit details
                </button>
              )}
              {!canEdit && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-400">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Locked after decision
                </span>
              )}
            </div>

            {editing ? (
              <div className="mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Customer name *" error={editErrors.customer_name}>
                    <input type="text" value={editForm.customer_name} onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Customer email *" error={editErrors.customer_email}>
                    <input type="email" value={editForm.customer_email} onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Customer phone" error={editErrors.customer_phone}>
                    <input type="tel" value={editForm.customer_phone} onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Order ID *" error={editErrors.order_id}>
                    <input type="text" value={editForm.order_id} onChange={(e) => setEditForm({ ...editForm, order_id: e.target.value })} className={`${inputCls} font-mono`} />
                  </Field>
                  <Field label="Item name *" error={editErrors.item_name}>
                    <input type="text" value={editForm.item_name} onChange={(e) => setEditForm({ ...editForm, item_name: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Item SKU *" error={editErrors.item_sku}>
                    <input type="text" value={editForm.item_sku} onChange={(e) => setEditForm({ ...editForm, item_sku: e.target.value })} className={`${inputCls} font-mono`} />
                  </Field>
                  <Field label="Quantity *" error={editErrors.quantity}>
                    <input type="number" min={1} max={999} step={1} value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Reason *" error={editErrors.reason}>
                    <select value={editForm.reason} onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} className={inputCls}>
                      {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                </div>
                <p className="mt-3 text-xs text-stone-400">Changing the Order ID or SKU re-checks the one-live-request-per-order-and-item rule on the server.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={saveEdit} disabled={savingEdit} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
                    {savingEdit && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Save changes
                  </button>
                  <button type="button" onClick={() => setEditing(false)} disabled={savingEdit} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100">Cancel</button>
                </div>
              </div>
            ) : (
              <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-stone-400">Customer</dt>
                  <dd className="mt-1 font-medium text-stone-900">{req.customer_name}</dd>
                  <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-stone-600 break-all"><Mail className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden="true" />{req.customer_email}</dd>
                  {req.customer_phone && (
                    <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-stone-600"><Phone className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden="true" />{req.customer_phone}</dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-stone-400">Order</dt>
                  <dd className="mt-1 font-mono font-medium text-stone-900">{req.order_id}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-stone-400">Item</dt>
                  <dd className="mt-1 font-medium text-stone-900">{req.item_name}</dd>
                  <dd className="mt-0.5 font-mono text-sm text-stone-500">{req.item_sku} · Qty {req.quantity}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-stone-400">Reason</dt>
                  <dd className="mt-1 font-medium text-stone-900">{req.reason}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-stone-400">Resolution</dt>
                  <dd className="mt-1 font-medium text-stone-900">
                    {req.resolution
                      ? req.resolution === 'Refund'
                        ? `Refund · ${formatMoney(req.refund_amount)}`
                        : req.resolution
                      : '—'}
                  </dd>
                  {!req.resolution && <dd className="mt-0.5 text-sm text-stone-400">Set when the request is approved.</dd>}
                </div>
              </dl>
            )}
          </section>

          {/* Notes */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" aria-label="Notes">
            <h2 className="font-display text-lg font-semibold text-stone-900">Notes ({notes.length})</h2>
            <p className="mt-0.5 text-xs text-stone-400">Chronological, oldest first. Notes are append-only — they can never be edited or deleted, and can be added in any status.</p>

            {notes.length === 0 ? (
              <p className="mt-4 rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-500">No notes yet. Add the first note below.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
                      <span className="font-semibold text-stone-800">{n.author}</span>
                      <span className="text-stone-400">{formatDateTime(n.created_at)}</span>
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{n.body}</p>
                  </li>
                ))}
              </ol>
            )}

            <form onSubmit={submitNote} className="mt-5 border-t border-stone-100 pt-4">
              <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
                <Field label="Your name">
                  <input type="text" value={noteAuthor} onChange={(e) => setNoteAuthor(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Add a note" error={noteError || undefined}>
                  <textarea rows={3} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Update from the customer, warehouse check, decision rationale…" className={inputCls} />
                </Field>
              </div>
              <button type="submit" disabled={addingNote} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60">
                {addingNote ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />}
                Add note
              </button>
            </form>
          </section>
        </div>

        {/* Actions rail — only actions legal in the current state are offered */}
        <aside className="space-y-5">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" aria-label="Actions">
            <h2 className="font-display text-lg font-semibold text-stone-900">Next steps</h2>
            <p className="mt-0.5 text-xs text-stone-400">Only actions legal from <strong>{req.status}</strong> are shown. The server enforces the same rules for direct API calls.</p>
            <div className="mt-4 space-y-2.5">
              {allowed.includes('In Review') && (
                <button type="button" disabled={busy !== null} onClick={() => doTransition('In Review')} className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
                  {busy === 'In Review' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                  Start review
                </button>
              )}
              {allowed.includes('Approved') && (
                <button type="button" disabled={busy !== null} onClick={() => { setApproveErrors({}); setActionError(null); setModal('approve') }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Approve with resolution…
                </button>
              )}
              {allowed.includes('Rejected') && (
                <button type="button" disabled={busy !== null} onClick={() => setModal('reject')} className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                  <Ban className="h-4 w-4" aria-hidden="true" /> Reject request…
                </button>
              )}
              {allowed.includes('Completed') && (
                <button type="button" disabled={busy !== null} onClick={() => setModal('complete')} className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
                  <Check className="h-4 w-4" aria-hidden="true" /> Mark as completed…
                </button>
              )}
              {isFinal && (
                <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  This request is <strong>{req.status}</strong> — a final status. No further transitions are possible. You can still add notes.
                </p>
              )}
            </div>
          </section>

          {req.resolution && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5" aria-label="Resolution">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-900">Resolution on record</h2>
              <p className="mt-2 font-display text-xl font-bold text-emerald-950">{req.resolution}</p>
              {req.resolution === 'Refund'
                ? <p className="mt-0.5 text-sm text-emerald-900">Refund amount: <strong>{formatMoney(req.refund_amount)}</strong></p>
                : <p className="mt-0.5 text-sm text-emerald-900">No refund amount is recorded for non-refund resolutions.</p>}
            </section>
          )}

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" aria-label="Danger zone">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Remove from desk</h2>
            {canRemove ? (
              <>
                <p className="mt-2 text-sm text-stone-600">Soft-deletes this request: it disappears from the queue and can no longer be opened, but the record (and its notes) stay in the database.</p>
                <button type="button" disabled={busy !== null} onClick={() => setModal('remove')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove request…
                </button>
              </>
            ) : (
              <p className="mt-2 text-sm text-stone-500">Only <strong>Open</strong> or <strong>Rejected</strong> requests can be removed. This request is {req.status}, so removal is unavailable.</p>
            )}
          </section>
        </aside>
      </div>

      {/* Approve modal */}
      {modal === 'approve' && (
        <Modal title={`Approve ${req.reference}`} onClose={() => setModal(null)}>
          <p className="text-sm text-stone-600">Approving requires a resolution. A Refund needs an amount greater than zero; Replacement and Store Credit never record a refund amount.</p>
          <fieldset className="mt-4">
            <legend className="text-[13px] font-medium text-stone-700">Resolution *</legend>
            <div className="mt-2 grid gap-2">
              {RESOLUTIONS.map((r) => (
                <label key={r} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${approveResolution === r ? 'border-teal-700 bg-teal-50 ring-1 ring-teal-700/30' : 'border-stone-200 hover:bg-stone-50'}`}>
                  <input type="radio" name="resolution" value={r} checked={approveResolution === r} onChange={() => { setApproveResolution(r); setApproveErrors({}) }} className="h-4 w-4 accent-teal-700" />
                  <span className="text-sm font-medium text-stone-900">{r}</span>
                  <span className="ml-auto text-xs text-stone-400">
                    {r === 'Refund' ? 'Money back to customer' : r === 'Replacement' ? 'Send a new item' : 'Balance for future orders'}
                  </span>
                </label>
              ))}
            </div>
            {approveErrors.resolution && <p className="mt-1.5 text-xs font-medium text-rose-700" role="alert">{approveErrors.resolution}</p>}
          </fieldset>
          {approveResolution === 'Refund' ? (
            <div className="mt-4">
              <Field label="Refund amount (USD) *" error={approveErrors.refund_amount}>
                <input type="number" min="0.01" step="0.01" inputMode="decimal" value={approveAmount} onChange={(e) => setApproveAmount(e.target.value)} placeholder="e.g. 49.99" className={inputCls} />
              </Field>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600">No refund amount will be recorded for a {approveResolution} resolution.</p>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                if (approveResolution === 'Refund') {
                  const amount = Number(approveAmount)
                  if (!approveAmount || !Number.isFinite(amount) || amount <= 0) {
                    setApproveErrors({ refund_amount: 'Enter an amount greater than zero.' })
                    return
                  }
                  doTransition('Approved', { resolution: 'Refund', refund_amount: amount }, 'approve')
                } else {
                  doTransition('Approved', { resolution: approveResolution, refund_amount: null }, 'approve')
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy === 'approve' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Approve request
            </button>
            <button type="button" onClick={() => setModal(null)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100">Cancel</button>
          </div>
        </Modal>
      )}

      {modal === 'reject' && (
        <Modal title={`Reject ${req.reference}?`} onClose={() => setModal(null)}>
          <p className="text-sm leading-relaxed text-stone-600">
            Rejection is <strong>final</strong> — the request cannot be reopened or edited afterwards (notes can still be added).
            Consider adding a note first explaining why, so the next agent has the full story.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" disabled={busy !== null} onClick={() => doTransition('Rejected', undefined, 'reject')} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
              {busy === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
              Reject request
            </button>
            <button type="button" onClick={() => setModal(null)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100">Cancel</button>
          </div>
        </Modal>
      )}

      {modal === 'complete' && (
        <Modal title={`Complete ${req.reference}?`} onClose={() => setModal(null)}>
          <p className="text-sm leading-relaxed text-stone-600">
            Only complete this once the resolution has actually been fulfilled
            ({req.resolution === 'Refund' ? `refund of ${formatMoney(req.refund_amount)} sent` : req.resolution === 'Replacement' ? 'replacement shipped' : 'store credit issued'}).
            Completed is a <strong>final</strong> status.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" disabled={busy !== null} onClick={() => doTransition('Completed', undefined, 'complete')} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
              {busy === 'complete' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              Mark completed
            </button>
            <button type="button" onClick={() => setModal(null)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100">Cancel</button>
          </div>
        </Modal>
      )}

      {modal === 'remove' && (
        <Modal title={`Remove ${req.reference}?`} onClose={() => setModal(null)}>
          <p className="text-sm leading-relaxed text-stone-600">
            This <strong>soft-deletes</strong> the request: it will disappear from the queue and its page will return “not found”,
            but the record and notes are kept in the database. There is no un-remove in this desk UI.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" disabled={busy !== null} onClick={doRemove} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
              {busy === 'remove' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
              Remove request
            </button>
            <button type="button" onClick={() => setModal(null)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
