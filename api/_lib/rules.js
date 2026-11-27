// Shared domain rules for ReturnDesk API routes.
// Every business rule from the assignment is enforced here / in the route
// handlers, so direct API calls cannot bypass the UI.

export const STATUSES = ['Open', 'In Review', 'Approved', 'Rejected', 'Completed'];
export const REASONS = ['Damaged', 'Wrong Item', 'Size Issue', 'Not As Described', 'Changed Mind'];
export const RESOLUTIONS = ['Refund', 'Replacement', 'Store Credit'];

// Rule 1: the only legal lifecycle transitions. Rejected and Completed are final.
export const TRANSITIONS = {
  'Open': ['In Review'],
  'In Review': ['Approved', 'Rejected'],
  'Approved': ['Completed'],
  'Rejected': [],
  'Completed': [],
};

// Rule 3: a request blocks a duplicate for the same order + item while it is
// "live". Rejected / Completed (and soft-deleted) requests never block.
export const LIVE_STATUSES = ['Open', 'In Review', 'Approved'];

// Rule 4: details may only be edited before a decision.
export const EDITABLE_STATUSES = ['Open', 'In Review'];

// Rule 5: soft removal is only allowed for Open or Rejected requests.
export const REMOVABLE_STATUSES = ['Open', 'Rejected'];

// Fields clients may never set directly (server-managed).
export const MANAGED_FIELDS = ['id', 'reference', 'status', 'resolution', 'refund_amount', 'deleted_at', 'created_at', 'updated_at'];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Consistent machine-readable error body for every anticipated refusal:
// { "error": { "code": "...", "message": "...", "details": { ... } } }
export function sendError(res, status, code, message, details) {
  const body = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return res.status(status).json(body);
}

export function methodNotAllowed(res, allowed, message) {
  res.setHeader('Allow', allowed.join(', '));
  return sendError(res, 405, 'METHOD_NOT_ALLOWED', message || `Method not allowed. Allowed methods: ${allowed.join(', ')}.`);
}

export function safeBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

export function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function escapeLike(value) {
  return value.replace(/[%_\\]/g, '\\$&');
}

// Fetch a request that is visible to the desk (soft-deleted rows are hidden
// from every subsequent fetch — Rule 5).
export async function getVisibleRequest(supabase, id) {
  const { data, error } = await supabase
    .from('return_requests')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Rule 3 pre-check, executed in SQL. Order id and item SKU are compared
// case-insensitively after trimming (values are stored trimmed on write).
// The hard concurrent-safety guarantee is the partial unique index in
// db/migrations/001_init.sql; unique violations from it are mapped to 409
// by the create/edit handlers as a second line of defence.
export async function findLiveDuplicate(supabase, orderId, itemSku, excludeId) {
  let query = supabase
    .from('return_requests')
    .select('id, reference, status, order_id, item_sku')
    .in('status', LIVE_STATUSES)
    .is('deleted_at', null)
    .ilike('order_id', escapeLike(String(orderId).trim()))
    .ilike('item_sku', escapeLike(String(itemSku).trim()));
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

export function duplicateError(res, existing) {
  return sendError(
    res, 409, 'DUPLICATE_LIVE_REQUEST',
    `A live request already exists for this order and item (${existing.reference}, status: ${existing.status}). Only one live request per order and item is allowed; the earlier request must be Rejected or Completed first.`,
    { existing_id: existing.id, existing_reference: existing.reference, existing_status: existing.status }
  );
}

const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Human-readable unique reference, e.g. RTN-2026-K7M4QX.
// Uniqueness is checked against the database with retries; the column also
// carries a UNIQUE constraint in the migration.
export async function generateReference(supabase) {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 8; attempt++) {
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      suffix += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
    }
    const reference = `RTN-${year}-${suffix}`;
    const { data, error } = await supabase
      .from('return_requests')
      .select('id')
      .eq('reference', reference)
      .maybeSingle();
    if (error) throw error;
    if (!data) return reference;
  }
  throw new Error('Could not generate a unique reference. Please retry.');
}

// Validates customer / order / item fields for create (partial=false) and
// edit (partial=true). Returns { values, errors } where errors is keyed by
// field name so the UI can show messages next to inputs.
export function validateRequestFields(body, { partial = false } = {}) {
  const errors = {};
  const values = {};

  for (const field of MANAGED_FIELDS) {
    if (body[field] !== undefined) {
      errors[field] = `"${field}" is managed by the server and cannot be set directly.`;
    }
  }

  const has = (key) => body[key] !== undefined;
  const str = (key) => (typeof body[key] === 'string' ? body[key].trim() : body[key]);

  function requiredString(key, label, max) {
    if (partial && !has(key)) return;
    const v = str(key);
    if (typeof v !== 'string' || v.length === 0) {
      errors[key] = `${label} is required.`;
    } else if (v.length > max) {
      errors[key] = `${label} must be at most ${max} characters.`;
    } else {
      values[key] = v;
    }
  }

  requiredString('customer_name', 'Customer name', 120);
  requiredString('order_id', 'Order ID', 60);
  requiredString('item_name', 'Item name', 200);
  requiredString('item_sku', 'Item SKU', 80);

  if (!partial || has('customer_email')) {
    const v = str('customer_email');
    if (typeof v !== 'string' || v.length === 0) {
      errors.customer_email = 'Customer email is required.';
    } else if (v.length > 200 || !EMAIL_RE.test(v)) {
      errors.customer_email = 'Customer email must be a valid email address.';
    } else {
      values.customer_email = v;
    }
  }

  if (has('customer_phone')) {
    const v = str('customer_phone');
    if (v === null || v === '') {
      values.customer_phone = null;
    } else if (typeof v !== 'string' || v.length > 40) {
      errors.customer_phone = 'Customer phone must be at most 40 characters.';
    } else {
      values.customer_phone = v;
    }
  }

  if (!partial || has('quantity')) {
    const n = Number(body.quantity);
    if (body.quantity === undefined || body.quantity === null || body.quantity === '') {
      errors.quantity = 'Quantity is required.';
    } else if (!Number.isInteger(n) || n < 1 || n > 999) {
      errors.quantity = 'Quantity must be a whole number between 1 and 999.';
    } else {
      values.quantity = n;
    }
  }

  if (!partial || has('reason')) {
    const v = str('reason');
    if (typeof v !== 'string' || v.length === 0) {
      errors.reason = 'Reason is required.';
    } else if (!REASONS.includes(v)) {
      errors.reason = `Reason must be one of: ${REASONS.join(', ')}.`;
    } else {
      values.reason = v;
    }
  }

  return { values, errors, hasErrors: Object.keys(errors).length > 0 };
}
