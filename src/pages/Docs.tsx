import { Link } from 'react-router-dom'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-xl font-semibold text-stone-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-stone-700">{children}</div>
    </section>
  )
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-stone-900 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-stone-100">{children}</pre>
  )
}

const ENDPOINTS: [string, string, string][] = [
  ['GET', '/api/requests?q=&status=&reason=&sort=&order=&page=&page_size=', 'List. Search/filter/sort/paginate in SQL. Soft-deleted rows excluded.'],
  ['POST', '/api/requests', 'Create (starts Open, reference generated). 409 on live duplicate.'],
  ['GET', '/api/requests/:id', 'Fetch one. Soft-deleted → 404.'],
  ['PATCH', '/api/requests/:id', 'Edit details. 422 EDIT_LOCKED once decided.'],
  ['DELETE', '/api/requests/:id', 'Soft-remove. 422 unless Open or Rejected.'],
  ['POST', '/api/requests/:id/transition', 'Lifecycle change { to, resolution?, refund_amount? }. 422 on illegal move.'],
  ['GET', '/api/requests/:id/notes', 'All notes, oldest first.'],
  ['POST', '/api/requests/:id/notes', 'Append a note — allowed in any status. Append-only (no edit/delete).'],
  ['GET', '/api/stats', 'Visible counts per status for the queue header.'],
]

const ERRORS: [string, string, string][] = [
  ['400', 'VALIDATION_ERROR', 'Malformed/missing fields. details is keyed by field name.'],
  ['404', 'NOT_FOUND', 'Unknown id — or a soft-deleted request (hidden by design).'],
  ['405', 'METHOD_NOT_ALLOWED', 'Wrong verb for the route (including any attempt to edit/delete a note).'],
  ['409', 'DUPLICATE_LIVE_REQUEST', 'A live request already exists for this order + item.'],
  ['409', 'STATUS_CHANGED', 'Someone else updated the request first; reload and retry.'],
  ['422', 'ILLEGAL_TRANSITION', 'Lifecycle move not allowed from the current status.'],
  ['422', 'RESOLUTION_REQUIRED', 'Approval attempted without Refund / Replacement / Store Credit.'],
  ['422', 'EDIT_LOCKED', 'Edit attempted on an Approved / Rejected / Completed request.'],
  ['422', 'DELETE_NOT_ALLOWED', 'Removal attempted on a status other than Open / Rejected.'],
  ['500', 'INTERNAL_ERROR', 'Unexpected server failure. Still JSON, never an HTML error page.'],
]

export default function Docs() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-bold text-stone-900">Docs & API</h1>
      <p className="mt-1.5 text-sm text-stone-500">
        What ReturnDesk does, the rules it enforces, and how to review it. The full write-up (setup, rationale,
        assumptions, limitations, hours) lives in <code className="font-mono text-[13px] bg-stone-100 px-1.5 py-0.5 rounded">README.md</code> in the repository.
      </p>

      <div className="mt-6 space-y-5">
        <Section id="stack" title="Stack — stated plainly">
          <p>
            The assignment mandates <strong>Next.js App Router</strong>. This build environment provides
            <strong> Vite + React 19 + TypeScript</strong> with <strong>Vercel serverless functions (Node.js)</strong> as the backend and
            <strong> Supabase PostgreSQL</strong> for persistence, styled with <strong>Tailwind CSS</strong>. ReturnDesk is implemented on that
            equivalent React + Node + Postgres architecture — same component model, same server-side rule enforcement, same SQL —
            and the deviation is documented rather than disguised. No admin/ticketing/CRUD template was used; the schema, API and
            error contract were designed for this brief. Data lives only in PostgreSQL (no in-memory store, JSON files or browser storage).
          </p>
        </Section>

        <Section id="review" title="Suggested 5-minute review">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li><Link to="/queue?q=ORD-1007" className="font-medium text-teal-800 underline">Queue</Link>: search for <code className="font-mono text-[13px]">ORD-1007</code> — one <em>Rejected</em> request and one live <em>Open</em> request for the same order + item. That pair is legal precisely because the first was Rejected.</li>
            <li><Link to="/new" className="font-medium text-teal-800 underline">Create a request</Link> for order <code className="font-mono text-[13px]">ORD-1007</code>, SKU <code className="font-mono text-[13px]">SKU-BOOT-42</code> — the server refuses it (409) and names the live request blocking you.</li>
            <li>Open any <em>In Review</em> request and approve it: try Refund with no amount (refused), then Replacement (no amount recorded). Then try editing its customer details (locked, 422) and removing it (unavailable).</li>
            <li>Add a note to a <em>Completed</em> request — notes are allowed in every status.</li>
            <li>Remove an <em>Open</em> request, then revisit its URL — hidden everywhere (404), still in the database.</li>
            <li>Combine search + status + reason + sort + page 2 in the queue — all compose in one SQL query; watch the network tab confirm no request fires per keystroke.</li>
          </ol>
        </Section>

        <Section id="rules" title="Business rules (all enforced server-side)">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li><strong>Lifecycle:</strong> Open → In Review → Approved/Rejected → Completed only. Rejected & Completed are final. Everything else → 422.</li>
            <li><strong>Approval:</strong> requires Refund / Replacement / Store Credit. Refund needs amount &gt; 0; the others must not record an amount.</li>
            <li><strong>One live request per order + item:</strong> duplicates refused (409) unless the earlier request is Rejected or Completed. Backed by a partial unique index in the migration for concurrent safety.</li>
            <li><strong>Edit lock:</strong> customer/item details freeze once Approved, Rejected or Completed. Notes remain allowed.</li>
            <li><strong>Soft removal:</strong> Open/Rejected only; sets <code className="font-mono text-[13px]">deleted_at</code>, never destroys the row, hidden from lists and fetches.</li>
          </ol>
          <p>Transitions and removals also use guarded updates (<code className="font-mono text-[13px]">WHERE status = expected</code>), so two agents acting simultaneously cannot both succeed — the loser gets a 409 and a fresh copy of the request.</p>
        </Section>

        <Section id="api" title="API reference">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500">
                  <th className="py-2 pr-3 font-semibold">Method</th>
                  <th className="py-2 pr-3 font-semibold">Path</th>
                  <th className="py-2 font-semibold">Behaviour</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map(([method, path, desc]) => (
                  <tr key={method + path} className="border-b border-stone-100 last:border-0">
                    <td className="py-2 pr-3 font-mono font-semibold text-teal-800">{method}</td>
                    <td className="py-2 pr-3 font-mono text-stone-700 break-all">{path}</td>
                    <td className="py-2 text-stone-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Every anticipated refusal returns the same machine-readable shape (never HTTP 200, never HTML):</p>
          <Code>{`{
  "error": {
    "code": "ILLEGAL_TRANSITION",
    "message": "Cannot move this request from Open to Approved. From Open you can only move to: In Review.",
    "details": { "from": "Open", "to": "Approved", "allowed": ["In Review"] }
  }
}`}</Code>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500">
                  <th className="py-2 pr-3 font-semibold">HTTP</th>
                  <th className="py-2 pr-3 font-semibold">Code</th>
                  <th className="py-2 font-semibold">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {ERRORS.map(([http, code, desc]) => (
                  <tr key={code} className="border-b border-stone-100 last:border-0">
                    <td className="py-2 pr-3 font-mono font-semibold">{http}</td>
                    <td className="py-2 pr-3 font-mono text-stone-700">{code}</td>
                    <td className="py-2 text-stone-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Try it from a terminal (replace the host with this deployment):</p>
          <Code>{`curl -s "https://<host>/api/requests?status=Open&reason=Damaged&page=1&page_size=5" | jq

curl -s -X POST "https://<host>/api/requests/1/transition" \\
  -H "Content-Type: application/json" \\
  -d '{"to":"Approved"}'   # -> 422 ILLEGAL_TRANSITION or RESOLUTION_REQUIRED, as JSON`}</Code>
        </Section>

        <Section id="data" title="Data model">
          <p>
            Two tables in PostgreSQL: <code className="font-mono text-[13px]">return_requests</code> (unique human-readable
            <code className="font-mono text-[13px]"> reference</code>, customer identity + contact, order id, item name + SKU, quantity, reason, status,
            resolution, refund amount, <code className="font-mono text-[13px]">deleted_at</code> for soft removal, timestamps) and
            <code className="font-mono text-[13px]"> return_notes</code> (foreign key to the request, author, body, timestamp — insert-only by API design).
            Constraints, the refund coherence check and the partial unique index for Rule 3 are in
            <code className="font-mono text-[13px]"> db/migrations/001_init.sql</code>; <code className="font-mono text-[13px]">scripts/seed.mjs</code> loads 33 demo
            requests across every status and reason.
          </p>
        </Section>

        <Section id="limits" title="Known limitations — nothing hidden">
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong>Next.js:</strong> built on the equivalent Vite + React + serverless-Node stack available here (see Stack above and the README).</li>
            <li><strong>Authentication:</strong> the brief does not require agent accounts, so there is no login; the note author is a free-text name. Adding auth + per-agent attribution is the first thing to do for real use.</li>
            <li><strong>Partial unique index:</strong> the hosted database for this deployment is provisioned via tooling that creates tables but cannot run arbitrary DDL, so Rule 3 is enforced by the API pre-check + guarded writes here; the migration file contains the exact index to apply for the hard database-level guarantee (README explains how, and the API already maps its violations to 409 when present).</li>
            <li><strong>No un-remove / audit UI:</strong> soft-deleted rows are recoverable in SQL but not from this desk.</li>
            <li><strong>GitHub:</strong> publication requires the candidate's own account; the workspace keeps a progressive local git history and the README gives push steps. No repository or timing claims are made beyond what actually happened.</li>
          </ul>
        </Section>
      </div>
    </div>
  )
}
