import supabase from './db-client.js';
import { STATUSES, cors, sendError } from './_lib/rules.js';

// GET /api/stats — visible request counts per status for the queue header.
// Counts are computed in SQL (HEAD count queries), excluding soft-deleted rows.
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed. Allowed methods: GET.');
    }

    const byStatus = {};
    await Promise.all(STATUSES.map(async (status) => {
      const { count, error } = await supabase
        .from('return_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)
        .is('deleted_at', null);
      if (error) throw error;
      byStatus[status] = count ?? 0;
    }));

    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
    return res.status(200).json({ total, by_status: byStatus });
  } catch (err) {
    console.error('API error (stats):', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong on the server. Please try again.');
  }
}
