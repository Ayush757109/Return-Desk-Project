import supabase from '../../db-client.js';
import {
  EDITABLE_STATUSES, REMOVABLE_STATUSES, cors, sendError, safeBody, parseId,
  getVisibleRequest, validateRequestFields, findLiveDuplicate, duplicateError,
} from '../../_lib/rules.js';

// GET    /api/requests/:id — fetch one visible request (soft-deleted → 404).
// PATCH  /api/requests/:id — edit details (Rule 4: only before a decision).
// DELETE /api/requests/:id — soft-remove (Rule 5: only Open or Rejected).
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const id = parseId(req.query.id);
    if (!id) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Request id must be a positive integer.', { id: 'Invalid id.' });
    }

    const current = await getVisibleRequest(supabase, id);
    if (!current) {
      return sendError(res, 404, 'NOT_FOUND', 'This request does not exist or has been removed.');
    }

    if (req.method === 'GET') {
      return res.status(200).json(current);
    }

    if (req.method === 'PATCH') {
      // Rule 4: locked once Approved, Rejected or Completed.
      if (!EDITABLE_STATUSES.includes(current.status)) {
        return sendError(
          res, 422, 'EDIT_LOCKED',
          `This request is ${current.status} and its details can no longer be edited. You can still add notes.`,
          { status: current.status }
        );
      }

      const body = safeBody(req);
      const { values, errors, hasErrors } = validateRequestFields(body, { partial: true });
      if (hasErrors) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'The changes could not be saved. Please fix the highlighted fields.', errors);
      }
      if (Object.keys(values).length === 0) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'No editable fields were provided.');
      }

      // Rule 3 still applies if the order or item identity changes.
      const nextOrder = values.order_id ?? current.order_id;
      const nextSku = values.item_sku ?? current.item_sku;
      if (nextOrder !== current.order_id || nextSku !== current.item_sku) {
        const duplicate = await findLiveDuplicate(supabase, nextOrder, nextSku, id);
        if (duplicate) return duplicateError(res, duplicate);
      }

      const { data, error } = await supabase
        .from('return_requests')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .in('status', EDITABLE_STATUSES)
        .is('deleted_at', null)
        .select();
      if (error) {
        if (error.code === '23505') {
          const raced = await findLiveDuplicate(supabase, nextOrder, nextSku, id);
          if (raced) return duplicateError(res, raced);
          return sendError(res, 409, 'CONFLICT', 'A conflicting change was just saved. Please reload and try again.');
        }
        throw error;
      }
      if (!data || data.length === 0) {
        return sendError(res, 409, 'STATUS_CHANGED', 'This request changed while you were editing. Reload it and try again.');
      }
      return res.status(200).json(data[0]);
    }

    if (req.method === 'DELETE') {
      // Rule 5: soft deletion only, and only for Open or Rejected.
      if (!REMOVABLE_STATUSES.includes(current.status)) {
        return sendError(
          res, 422, 'DELETE_NOT_ALLOWED',
          `Only Open or Rejected requests can be removed. This request is ${current.status}.`,
          { status: current.status, allowed_statuses: REMOVABLE_STATUSES }
        );
      }

      const deletedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from('return_requests')
        .update({ deleted_at: deletedAt, updated_at: deletedAt })
        .eq('id', id)
        .eq('status', current.status)
        .is('deleted_at', null)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        return sendError(res, 409, 'STATUS_CHANGED', 'This request changed just now. Reload it and try again.');
      }
      return res.status(200).json({ ok: true, id, reference: current.reference, deleted_at: deletedAt });
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed. Allowed methods: GET, PATCH, DELETE.');
  } catch (err) {
    console.error('API error (request detail):', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong on the server. Please try again.');
  }
}
