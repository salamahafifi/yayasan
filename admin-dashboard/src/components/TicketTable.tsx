import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS, formatDate } from '../lib/format';
import type { Ticket, TicketStatus, IssueCategory } from '../types/database';

const STATUS_OPTIONS: TicketStatus[] = ['baru', 'siasat', 'majlis_perbandaran', 'selesai', 'tangguh'];
const CATEGORY_OPTIONS: IssueCategory[] = ['jalan_berlubang', 'banjir', 'lampu_jalan', 'sampah', 'lain_lain'];

function TicketTable() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | 'all'>('all');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      let query = supabase.from('tickets').select('*').order('created_at', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);

      const { data, error } = await query;

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setTickets([]);
      } else {
        setError(null);
        setTickets((data ?? []) as Ticket[]);
      }
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [statusFilter, categoryFilter]);

  return (
    <div className="ticket-table-wrapper">
      <div className="ticket-table__filters">
        <label>
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}>
            <option value="all">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as IssueCategory | 'all')}>
            <option value="all">All</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </label>
        <span className="ticket-table__count">{tickets.length} tickets</span>
      </div>

      {loading && <p className="status-text">Loading…</p>}
      {error && <p className="status-text status-text--error">{error}</p>}

      {!loading && !error && (
        <table className="ticket-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Category</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Reporter</th>
              <th>Reported</th>
              <th>Reports</th>
              <th>Public</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>{t.ticket_number}</td>
                <td>{CATEGORY_LABELS[t.category]}</td>
                <td>{STATUS_LABELS[t.status]}</td>
                <td>{PRIORITY_LABELS[t.adun_priority]}</td>
                <td>
                  {t.name ?? '—'}
                  <br />
                  <span className="ticket-table__phone">{t.whatsapp_number}</span>
                </td>
                <td>{formatDate(t.created_at)}</td>
                <td>{t.upvote_count}</td>
                <td>{t.is_public ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default TicketTable;
