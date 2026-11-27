import supabase from '../../db-client.js';
import { cors, sendError, safeBody, parseId, getVisibleRequest } from '../../_lib/rules.js';

// GET  /api/requests/:id/notes — all notes, oldest first.
// POST /api/requests/:id/notes — append a note. Allowed in ANY status
//      (including Rejected/Completed). Notes are append-only: there is
//      deliberately no edit or delete route (PUT/PATCH/DELETE → 405).
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const id = parseId(req.query.id);
    if (!id) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Request id must be a positive integer.', { id: 'Invalid id.' });
    }

    if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
      res.setHeader('Allow', 'GET, POST');
      return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Notes are append-only and can never be edited or deleted.');
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed. Allowed methods: GET, POST.');
    }

    const current = await getVisibleRequest(supabase, id);
    if (!current) {
      return sendError(res, 404, 'NOT_FOUND', 'This request does not exist or has been removed.');
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('return_notes')
        .select('*')
        .eq('request_id', id)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    // POST — no status check on purpose: notes remain allowed after a decision.
    const body = safeBody(req);
    const errors = {};
    const noteBody = typeof body.body === 'string' ? body.body.trim() : '';
    const author = typeof body.author === 'string' ? body.author.trim() : '';
    if (!noteBody) errors.body = 'Note text is required.';
    if (noteBody.length > 4000) errors.body = 'Note text must be at most 4000 characters.';
    if (author.length > 120) errors.author = 'Author must be at most 120 characters.';
    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'The note could not be added. Please fix the highlighted fields.', errors);
    }

    const { data, error } = await supabase
      .from('return_notes')
      .insert({ request_id: id, author: author || 'Support Agent', body: noteBody })
      .select()
      .single();
    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error('API error (notes):', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong on the server. Please try again.');
  }
}
