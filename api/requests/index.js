import supabase from '../db-client.js';
import {
  STATUSES, REASONS, cors, sendError, safeBody,
  validateRequestFields, findLiveDuplicate, duplicateError, generateReference,
} from '../_lib/rules.js';

const SORTABLE = ['created_at', 'updated_at', 'customer_name', 'status'];

// GET /api/requests — list with server-side search, filters, sort, pagination.
// All of it is pushed into SQL via the Supabase/PostgREST query builder;
// the browser never receives rows it did not ask for.
//
// POST /api/requests — create a new request (always starts Open).
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const qRaw = typeof req.query.q === 'string' ? req.query.q : '';
      const status = req.query.status;
      const reason = req.query.reason;
      const sort = req.query.sort || 'created_at';
      const order = req.query.order || 'desc';

      if (status && !STATUSES.includes(status)) {
        return sendError(res, 400, 'VALIDATION_ERROR', `Invalid status filter. Must be one of: ${STATUSES.join(', ')}.`, { status: 'Invalid status.' });
      }
      if (reason && !REASONS.includes(reason)) {
        return sendError(res, 400, 'VALIDATION_ERROR', `Invalid reason filter. Must be one of: ${REASONS.join(', ')}.`, { reason: 'Invalid reason.' });
      }
      if (!SORTABLE.includes(sort)) {
        return sendError(res, 400, 'VALIDATION_ERROR', `Invalid sort field. Must be one of: ${SORTABLE.join(', ')}.`, { sort: 'Invalid sort field.' });
      }
      if (!['asc', 'desc'].includes(order)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Order must be "asc" or "desc".', { order: 'Invalid sort order.' });
      }

      let page = Number.parseInt(req.query.page, 10);
      let pageSize = Number.parseInt(req.query.page_size, 10);
      if (req.query.page !== undefined && Number.isNaN(page)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Page must be a number.', { page: 'Must be a number.' });
      }
      if (req.query.page_size !== undefined && Number.isNaN(pageSize)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Page size must be a number.', { page_size: 'Must be a number.' });
      }
      if (Number.isNaN(page) || page < 1) page = 1;
      if (Number.isNaN(pageSize)) pageSize = 10;
      pageSize = Math.min(50, Math.max(1, pageSize));

      let query = supabase
        .from('return_requests')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      if (status) query = query.eq('status', status);
      if (reason) query = query.eq('reason', reason);

      // Search matches customer name/email, order id or reference.
      // PostgREST .or() uses commas/parentheses as syntax, so strip those
      // from user input and escape LIKE wildcards before building the filter.
      const search = qRaw.replace(/[,()*]/g, ' ').replace(/[%_\\]/g, '\\$&').trim();
      if (search) {
        query = query.or(
          `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,order_id.ilike.%${search}%,reference.ilike.%${search}%`
        );
      }

      query = query
        .order(sort, { ascending: order === 'asc' })
        .order('id', { ascending: false });

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      const total = count ?? 0;
      return res.status(200).json({
        data: data || [],
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: Math.max(1, Math.ceil(total / pageSize)),
        },
      });
    }

    if (req.method === 'POST') {
      const body = safeBody(req);
      const { values, errors, hasErrors } = validateRequestFields(body);
      if (hasErrors) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'The request could not be created. Please fix the highlighted fields.', errors);
      }

      // Rule 3: one live request per order + item.
      const duplicate = await findLiveDuplicate(supabase, values.order_id, values.item_sku, null);
      if (duplicate) return duplicateError(res, duplicate);

      const reference = await generateReference(supabase);
      const { data, error } = await supabase
        .from('return_requests')
        .insert({
          reference,
          customer_name: values.customer_name,
          customer_email: values.customer_email,
          customer_phone: values.customer_phone ?? null,
          order_id: values.order_id,
          item_name: values.item_name,
          item_sku: values.item_sku,
          quantity: values.quantity,
          reason: values.reason,
          status: 'Open',
          resolution: null,
          refund_amount: null,
        })
        .select()
        .single();

      if (error) {
        // 23505 = unique_violation. If two creates raced past the pre-check,
        // the partial unique index (see migration) stops the second one here.
        if (error.code === '23505') {
          const raced = await findLiveDuplicate(supabase, values.order_id, values.item_sku, null);
          if (raced) return duplicateError(res, raced);
          return sendError(res, 409, 'CONFLICT', 'A conflicting request was just created. Please reload and try again.');
        }
        throw error;
      }
      return res.status(201).json(data);
    }

    res.setHeader('Allow', 'GET, POST');
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed. Allowed methods: GET, POST.');
  } catch (err) {
    console.error('API error (requests):', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong on the server. Please try again.');
  }
}
