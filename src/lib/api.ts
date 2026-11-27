// Typed client for the ReturnDesk API (/api/*).
// The API returns consistent JSON errors: { error: { code, message, details } }.
// Field names match the database columns (snake_case) by design.

export type Status = 'Open' | 'In Review' | 'Approved' | 'Rejected' | 'Completed'
export type Reason = 'Damaged' | 'Wrong Item' | 'Size Issue' | 'Not As Described' | 'Changed Mind'
export type Resolution = 'Refund' | 'Replacement' | 'Store Credit'

export interface ReturnRequest {
  id: number
  reference: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  order_id: string
  item_name: string
  item_sku: string
  quantity: number
  reason: Reason
  status: Status
  resolution: Resolution | null
  refund_amount: number | string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface ReturnNote {
  id: number
  request_id: number
  author: string
  body: string
  created_at: string
}

export interface ListResponse {
  data: ReturnRequest[]
  pagination: { page: number; page_size: number; total: number; total_pages: number }
}

export interface StatsResponse {
  total: number
  by_status: Record<Status, number>
}

export class ApiError extends Error {
  status: number
  code: string
  details?: Record<string, unknown>
  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {}
    if (this.details) {
      for (const [key, value] of Object.entries(this.details)) {
        if (typeof value === 'string') out[key] = value
      }
    }
    return out
  }
}

async function request<T>(path: string, options: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      ...options,
      signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.')
  }
  const text = await res.text()
  let json: unknown = null
  try { json = text ? JSON.parse(text) : null } catch { json = null }
  if (!res.ok) {
    const e = (json as { error?: { code?: string; message?: string; details?: Record<string, unknown> } } | null)?.error
    throw new ApiError(res.status, e?.code || 'ERROR', e?.message || `Request failed (${res.status}).`, e?.details)
  }
  return json as T
}

export interface ListParams {
  q?: string
  status?: string
  reason?: string
  sort?: string
  order?: string
  page?: number
  page_size?: number
}

export function listRequests(params: ListParams, signal?: AbortSignal): Promise<ListResponse> {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.status) qs.set('status', params.status)
  if (params.reason) qs.set('reason', params.reason)
  if (params.sort) qs.set('sort', params.sort)
  if (params.order) qs.set('order', params.order)
  qs.set('page', String(params.page ?? 1))
  qs.set('page_size', String(params.page_size ?? 10))
  return request<ListResponse>(`/api/requests?${qs.toString()}`, {}, signal)
}

export function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>('/api/stats')
}

export interface CreatePayload {
  customer_name: string
  customer_email: string
  customer_phone?: string | null
  order_id: string
  item_name: string
  item_sku: string
  quantity: number
  reason: string
}

export function createRequest(payload: CreatePayload): Promise<ReturnRequest> {
  return request<ReturnRequest>('/api/requests', { method: 'POST', body: JSON.stringify(payload) })
}

export function getRequest(id: number | string): Promise<ReturnRequest> {
  return request<ReturnRequest>(`/api/requests/${id}`)
}

export function updateRequest(id: number, patch: Partial<CreatePayload>): Promise<ReturnRequest> {
  return request<ReturnRequest>(`/api/requests/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export function deleteRequest(id: number): Promise<{ ok: boolean; id: number; reference: string }> {
  return request(`/api/requests/${id}`, { method: 'DELETE' })
}

export interface TransitionPayload {
  to: Status
  resolution?: Resolution | null
  refund_amount?: number | null
  expected_status?: Status
}

export function transitionRequest(id: number, payload: TransitionPayload): Promise<ReturnRequest> {
  return request<ReturnRequest>(`/api/requests/${id}/transition`, { method: 'POST', body: JSON.stringify(payload) })
}

export function listNotes(id: number | string): Promise<ReturnNote[]> {
  return request<ReturnNote[]>(`/api/requests/${id}/notes`)
}

export function addNote(id: number, payload: { author: string; body: string }): Promise<ReturnNote> {
  return request<ReturnNote>(`/api/requests/${id}/notes`, { method: 'POST', body: JSON.stringify(payload) })
}
