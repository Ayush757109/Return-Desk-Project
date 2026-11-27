import type { Status } from './api'

export const STATUSES: Status[] = ['Open', 'In Review', 'Approved', 'Rejected', 'Completed']
export const REASONS = ['Damaged', 'Wrong Item', 'Size Issue', 'Not As Described', 'Changed Mind'] as const
export const RESOLUTIONS = ['Refund', 'Replacement', 'Store Credit'] as const

// Mirror of the server-side transition map (api/_lib/rules.js).
// Used only to decide which buttons to show — the server is authoritative
// and re-checks every transition, so a stale UI can never force one through.
export const TRANSITIONS: Record<Status, Status[]> = {
  Open: ['In Review'],
  'In Review': ['Approved', 'Rejected'],
  Approved: ['Completed'],
  Rejected: [],
  Completed: [],
}

export const EDITABLE_STATUSES: Status[] = ['Open', 'In Review']
export const REMOVABLE_STATUSES: Status[] = ['Open', 'Rejected']

export const STATUS_STYLES: Record<Status, { pill: string; dot: string; blurb: string }> = {
  Open: {
    pill: 'bg-sky-50 text-sky-800 ring-sky-600/25',
    dot: 'bg-sky-500',
    blurb: 'New request waiting for an agent to start review.',
  },
  'In Review': {
    pill: 'bg-amber-50 text-amber-800 ring-amber-600/25',
    dot: 'bg-amber-500',
    blurb: 'An agent is reviewing this request.',
  },
  Approved: {
    pill: 'bg-emerald-50 text-emerald-800 ring-emerald-600/25',
    dot: 'bg-emerald-500',
    blurb: 'Approved with a resolution. Ready to complete once fulfilled.',
  },
  Rejected: {
    pill: 'bg-rose-50 text-rose-800 ring-rose-600/25',
    dot: 'bg-rose-500',
    blurb: 'Rejected. This is a final status.',
  },
  Completed: {
    pill: 'bg-stone-100 text-stone-700 ring-stone-500/25',
    dot: 'bg-stone-500',
    blurb: 'Resolution fulfilled. This is a final status.',
  },
}
