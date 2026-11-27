import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Plus, BookOpenText, PackagePlus, Eye, BadgeCheck, CheckCircle2,
  ShieldCheck, Database, ListFilter, MessageSquareText, Lock, Trash2, Undo2,
} from 'lucide-react'
import { getStats } from '../lib/api'
import type { StatsResponse } from '../lib/api'
import { STATUSES, STATUS_STYLES } from '../lib/constants'

const STEPS = [
  {
    icon: PackagePlus,
    title: '1. Create the request',
    text: 'Record the customer, order, item, quantity and reason. The server issues a unique reference like RTN-2026-K7M4QX and the request lands in the queue as Open.',
  },
  {
    icon: Eye,
    title: '2. Review it',
    text: 'An agent moves it to In Review, checks photos and warehouse facts, and keeps an append-only notes timeline that can never be rewritten.',
  },
  {
    icon: BadgeCheck,
    title: '3. Decide',
    text: 'Approve with a Refund, Replacement or Store Credit — refunds must carry an amount, the others must not — or reject with the reason on record.',
  },
  {
    icon: CheckCircle2,
    title: '4. Close it out',
    text: 'Once the refund lands or the replacement ships, mark it Completed. Final states are truly final; the full history stays readable.',
  },
]

const RULES = [
  {
    icon: ShieldCheck,
    title: 'Legal moves only',
    text: 'Open → In Review → Approved/Rejected → Completed. Every other jump is refused by the server with a 422 — even via direct API calls.',
  },
  {
    icon: BadgeCheck,
    title: 'Approvals need a resolution',
    text: 'Refund requires an amount greater than zero; Replacement and Store Credit never record one. The database schema checks the same coherence.',
  },
  {
    icon: Database,
    title: 'One live request per order + item',
    text: 'Duplicates are refused (409) while an earlier request is live. Once it is Rejected or Completed, the customer can ask again.',
  },
  {
    icon: Lock,
    title: 'Decisions lock the details',
    text: 'Customer and item details freeze once a request is decided. Notes remain open in every status, forever append-only.',
  },
  {
    icon: Trash2,
    title: 'Removal never destroys',
    text: 'Open or Rejected requests can be soft-removed: gone from the queue, still in PostgreSQL. Nothing is ever hard-deleted by the desk.',
  },
  {
    icon: ListFilter,
    title: 'Search lives in SQL',
    text: 'Search, filters, sorting and pagination run server-side in one query — debounced in the UI, never a request per keystroke.',
  },
]

export default function Landing() {
  const [stats, setStats] = useState<StatsResponse | null>(null)

  useEffect(() => {
    getStats().then(setStats).catch(() => setStats(null))
  }, [])

  return (
    <div>
      {/* Hero */}
      <header className="mx-auto max-w-3xl pt-6 text-center sm:pt-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-teal-700/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-800 ring-1 ring-inset ring-teal-700/20">
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
          ReturnDesk · PostgreSQL-backed
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-tight text-stone-900 sm:text-5xl">
          Returns, decided cleanly.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
          A returns desk for a small online store: create return and replacement requests against orders,
          review them, approve with a refund, replacement or store credit — with every business rule
          enforced on the server, not just in the browser.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link to="/queue" className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">
            Open the returns queue <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to="/new" className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 hover:bg-stone-50">
            <Plus className="h-4 w-4" aria-hidden="true" /> New request
          </Link>
          <Link to="/docs" className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">
            <BookOpenText className="h-4 w-4" aria-hidden="true" /> Docs & API
          </Link>
        </div>
      </header>

      {/* Live desk snapshot — real counts from GET /api/stats */}
      <section aria-label="Live desk snapshot" className="mx-auto mt-10 max-w-4xl rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-stone-900">On the desk right now</h2>
          <p className="text-xs text-stone-400">Live from the database — soft-removed requests excluded.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl bg-stone-50 px-4 py-3 text-center">
            <span className="block font-display text-3xl font-bold text-stone-900">{stats ? stats.total : '…'}</span>
            <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wider text-stone-500">Total</span>
          </div>
          {STATUSES.map((s) => (
            <Link
              key={s}
              to={`/queue?status=${encodeURIComponent(s)}`}
              className="rounded-xl bg-stone-50 px-4 py-3 text-center transition hover:bg-teal-50"
              title={`Show ${s} requests`}
            >
              <span className="block font-display text-3xl font-bold text-stone-900">{stats ? stats.by_status[s] : '…'}</span>
              <span className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[s].dot}`} aria-hidden="true" /> {s}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section aria-label="How the desk works" className="mx-auto mt-12 max-w-5xl">
        <h2 className="text-center font-display text-2xl font-bold text-stone-900 sm:text-3xl">How the desk works</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-stone-500">
          One lifecycle, no shortcuts. The desk only ever offers the actions that are legal right now —
          and the server re-checks every one of them.
        </p>
        <ol className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li key={step.title} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700/10 text-teal-800">
                <step.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3.5 font-display text-base font-semibold text-stone-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-5 flex max-w-2xl items-start justify-center gap-2 text-center text-xs leading-relaxed text-stone-400">
          <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Throughout every step, agents add notes to a permanent timeline — useful long after the decision, impossible to quietly edit later.
        </p>
      </section>

      {/* Rules */}
      <section aria-label="Rules enforced by the server" className="mx-auto mt-12 max-w-5xl">
        <h2 className="text-center font-display text-2xl font-bold text-stone-900 sm:text-3xl">Rules the server never bends</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-stone-500">
          Hand-crafted curl gets exactly the same refusals as the UI — as JSON, with the right HTTP status code.
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RULES.map((rule) => (
            <article key={rule.title} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white">
                <rule.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3.5 font-display text-base font-semibold text-stone-900">{rule.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{rule.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Review path */}
      <section aria-label="Try it" className="mx-auto mt-12 max-w-4xl rounded-2xl bg-teal-800 p-6 text-white shadow-sm sm:p-8">
        <h2 className="font-display text-2xl font-bold">Review it in five minutes</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-teal-50">
          <li>
            <Link to="/queue?q=ORD-1007" className="font-semibold underline underline-offset-2">Search ORD-1007</Link>
            {' '}— a Rejected request and a live Open one for the same boots. Legal, because the first was rejected.
          </li>
          <li>
            <Link to="/new" className="font-semibold underline underline-offset-2">Try to create a third</Link>
            {' '}for that order and SKU — the server refuses and names the request blocking you.
          </li>
          <li>
            <Link to="/queue?status=In%20Review" className="font-semibold underline underline-offset-2">Open an In Review request</Link>
            {' '}and approve it: Refund with no amount is refused; Replacement records none.
          </li>
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/queue" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-50">
            Start in the queue <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to="/docs" className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
            Read the full write-up
          </Link>
        </div>
      </section>

      <footer className="pb-4 pt-10 text-center text-xs leading-relaxed text-stone-400">
        ReturnDesk — a standalone take-home build. React + Node + PostgreSQL; schema, API and error contract
        designed for this brief. Details, assumptions and honest limitations are in Docs & API and the README.
      </footer>
    </div>
  )
}
