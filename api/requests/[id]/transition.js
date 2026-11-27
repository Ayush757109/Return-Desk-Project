import supabase from '../../db-client.js';
import {
  STATUSES, RESOLUTIONS, TRANSITIONS, cors, sendError, safeBody, parseId,
  getVisibleRequest,
} from '../../_lib/rules.js';

// POST /api/requests/:id/transition
// Body: { to, resolution?, refund_amount?, expected_status? }
//
// Rule 1: Open -> In Review -> Approved/Rejected -> Completed only.
// Rule 2: approval requires a resolution; Refund requires amount > 0;
//         Replacement / Store Credit must not carry a refund amount.
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed. Allowed methods: POST.');
    }

    const id = parseId(req.query.id);
    if (!id) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Request id must be a positive integer.', { id: 'Invalid id.' });
    }

    const body = safeBody(req);
    const to = typeof body.to === 'string' ? body.to.trim() : '';
    if (!STATUSES.includes(to)) {
      return sendError(res, 400, 'VALIDATION_ERROR', `"to" must be one of: ${STATUSES.join(', ')}.`, { to: 'Invalid target status.' });
    }

    const current = await getVisibleRequest(supabase, id);
    if (!current) {
      return sendError(res, 404, 'NOT_FOUND', 'This request does not exist or has been removed.');
    }

    if (body.expected_status !== undefined && body.expected_status !== current.status) {
      return sendError(
        res, 409, 'STATUS_CHANGED',
        `This request is now ${current.status} (you were looking at ${body.expected_status}). Reload it before acting.`,
        { current_status: current.status }
      );
    }

    const allowed = TRANSITIONS[current.status] || [];
    if (!allowed.includes(to)) {
      const hint = allowed.length > 0
        ? `From ${current.status} you can only move to: ${allowed.join(' or ')}.`
        : `${current.status} is a final status and cannot change.`;
      return sendError(
        res, 422, 'ILLEGAL_TRANSITION',
        `Cannot move this request from ${current.status} to ${to}. ${hint}`,
        { from: current.status, to, allowed }
      );
    }

    const patch = { status: to, updated_at: new Date().toISOString() };

    if (to === 'Approved') {
      const resolution = typeof body.resolution === 'string' ? body.resolution.trim() : '';
      if (!resolution) {
        return sendError(
          res, 422, 'RESOLUTION_REQUIRED',
          `Approving a request requires a resolution: ${RESOLUTIONS.join(', ')}.`,
          { resolution: 'A resolution is required to approve.' }
        );
      }
      if (!RESOLUTIONS.includes(resolution)) {
        return sendError(res, 400, 'VALIDATION_ERROR', `Resolution must be one of: ${RESOLUTIONS.join(', ')}.`, { resolution: 'Invalid resolution.' });
      }

      const hasAmount = body.refund_amount !== undefined && body.refund_amount !== null && body.refund_amount !== '';
      if (resolution === 'Refund') {
        const amount = Number(body.refund_amount);
        if (!hasAmount || !Number.isFinite(amount) || amount <= 0) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'A Refund resolution requires a refund amount greater than zero.', { refund_amount: 'Enter an amount greater than zero.' });
        }
        if (amount > 999999.99) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'Refund amount is unreasonably large.', { refund_amount: 'Amount is too large.' });
        }
        patch.resolution = 'Refund';
        patch.refund_amount = Math.round(amount * 100) / 100;
      } else {
        if (hasAmount) {
          return sendError(
            res, 400, 'VALIDATION_ERROR',
            `A ${resolution} resolution must not record a refund amount. Remove the amount or choose Refund.`,
            { refund_amount: 'Must be empty unless the resolution is Refund.' }
          );
        }
        patch.resolution = resolution;
        patch.refund_amount = null;
      }
    } else if (to === 'Rejected') {
      patch.resolution = null;
      patch.refund_amount = null;
    }
    // In Review / Completed keep whatever resolution was set at approval.

    // Guarded update: only succeeds if the status is still what we read,
    // so two agents acting at once cannot both win.
    const { data, error } = await supabase
      .from('return_requests')
      .update(patch)
      .eq('id', id)
      .eq('status', current.status)
      .is('deleted_at', null)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) {
      return sendError(res, 409, 'STATUS_CHANGED', 'This request was updated by someone else just now. Reload it and try again.');
    }
    return res.status(200).json(data[0]);
  } catch (err) {
    console.error('API error (transition):', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong on the server. Please try again.');
  }
}
