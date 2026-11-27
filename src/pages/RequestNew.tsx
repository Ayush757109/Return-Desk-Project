import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createRequest, addNote, ApiError } from '../lib/api'
import { REASONS } from '../lib/constants'
import { Field, ErrorBanner, inputCls } from '../components/ui'
import { useToast } from '../components/Toast'

interface FormState {
  customer_name: string
  customer_email: string
  customer_phone: string
  order_id: string
  item_name: string
  item_sku: string
  quantity: string
  reason: string
  first_note: string
  note_author: string
}

const INITIAL: FormState = {
  customer_name: '', customer_email: '', customer_phone: '', order_id: '',
  item_name: '', item_sku: '', quantity: '1', reason: '', first_note: '', note_author: 'Support Agent',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Mirrors the server rules for instant feedback. The server re-validates
// everything and its errors (if any) replace these.
function validateClient(f: FormState): Record<string, string> {
  const e: Record<string, string> = {}
  if (!f.customer_name.trim()) e.customer_name = 'Customer name is required.'
  if (!f.customer_email.trim()) e.customer_email = 'Customer email is required.'
  else if (!EMAIL_RE.test(f.customer_email.trim())) e.customer_email = 'Customer email must be a valid email address.'
  if (!f.order_id.trim()) e.order_id = 'Order ID is required.'
  if (!f.item_name.trim()) e.item_name = 'Item name is required.'
  if (!f.item_sku.trim()) e.item_sku = 'Item SKU is required.'
  const qty = Number(f.quantity)
  if (!f.quantity || !Number.isInteger(qty) || qty < 1 || qty > 999) e.quantity = 'Quantity must be a whole number between 1 and 999.'
  if (!f.reason) e.reason = 'Reason is required.'
  return e
}

export default function RequestNew() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [duplicateId, setDuplicateId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const set = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBanner(null)
    setDuplicateId(null)
    const clientErrors = validateClient(form)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }
    setSubmitting(true)
    try {
      const created = await createRequest({
        customer_name: form.customer_name.trim(),
        customer_email: form.customer_email.trim(),
        customer_phone: form.customer_phone.trim() || null,
        order_id: form.order_id.trim(),
        item_name: form.item_name.trim(),
        item_sku: form.item_sku.trim(),
        quantity: Number(form.quantity),
        reason: form.reason,
      })
      if (form.first_note.trim()) {
        try {
          await addNote(created.id, { author: form.note_author.trim() || 'Support Agent', body: form.first_note.trim() })
        } catch {
          toast.error(`Request ${created.reference} was created, but the first note could not be saved. You can add it again on the detail page.`)
          navigate(`/requests/${created.id}`)
          return
        }
      }
      toast.success(`Request ${created.reference} created and added to the queue.`)
      navigate(`/requests/${created.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = err.fieldErrors()
        if (Object.keys(fields).length > 0) setErrors((prev) => ({ ...prev, ...fields }))
        setBanner(err.message)
        const existingId = err.details?.existing_id
        if (err.code === 'DUPLICATE_LIVE_REQUEST' && typeof existingId === 'number') setDuplicateId(existingId)
      } else {
        setBanner('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/queue" className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-800 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to queue
      </Link>
      <h1 className="mt-3 font-display text-3xl font-bold text-stone-900">New return request</h1>
      <p className="mt-1 text-sm text-stone-500">
        Requests are created as <strong className="text-stone-700">Open</strong> with a generated reference.
        Only one live request is allowed per order and item — the server refuses duplicates.
      </p>

      {banner && (
        <div className="mt-5">
          <ErrorBanner message={banner} />
          {duplicateId && (
            <p className="mt-2 text-sm">
              <Link to={`/requests/${duplicateId}`} className="font-medium text-teal-800 underline">Open the existing live request →</Link>
            </p>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-6">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-stone-900">Customer</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Customer name *" error={errors.customer_name || undefined}>
              <input type="text" value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} placeholder="e.g. Amara Osei" className={inputCls} autoComplete="name" />
            </Field>
            <Field label="Customer email *" error={errors.customer_email || undefined}>
              <input type="email" value={form.customer_email} onChange={(e) => set('customer_email', e.target.value)} placeholder="customer@example.com" className={inputCls} autoComplete="email" />
            </Field>
            <Field label="Customer phone" error={errors.customer_phone || undefined} hint="Optional.">
              <input type="tel" value={form.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} placeholder="+1 555 010 2030" className={inputCls} autoComplete="tel" />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-stone-900">Order & item</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Order ID *" error={errors.order_id || undefined}>
              <input type="text" value={form.order_id} onChange={(e) => set('order_id', e.target.value)} placeholder="e.g. ORD-1042" className={`${inputCls} font-mono`} />
            </Field>
            <Field label="Item SKU *" error={errors.item_sku || undefined} hint="Duplicates are checked on Order ID + SKU.">
              <input type="text" value={form.item_sku} onChange={(e) => set('item_sku', e.target.value)} placeholder="e.g. SKU-SHOE-TR9" className={`${inputCls} font-mono`} />
            </Field>
            <Field label="Item name *" error={errors.item_name || undefined}>
              <input type="text" value={form.item_name} onChange={(e) => set('item_name', e.target.value)} placeholder="e.g. Trail Runner Shoes" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Quantity *" error={errors.quantity || undefined}>
                <input type="number" min={1} max={999} step={1} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Reason *" error={errors.reason || undefined}>
                <select value={form.reason} onChange={(e) => set('reason', e.target.value)} className={inputCls}>
                  <option value="">Choose…</option>
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-stone-900">First note <span className="text-sm font-normal text-stone-400">(optional)</span></h2>
          <div className="mt-4 grid gap-4">
            <Field label="Your name (note author)" hint="Shown on the note timeline. Notes can never be edited or deleted.">
              <input type="text" value={form.note_author} onChange={(e) => set('note_author', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Note">
              <textarea rows={3} value={form.first_note} onChange={(e) => set('first_note', e.target.value)} placeholder="What did the customer tell us? Condition, photos received, etc." className={inputCls} />
            </Field>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 pb-4">
          <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {submitting ? 'Creating…' : 'Create request'}
          </button>
          <Link to="/queue" className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
