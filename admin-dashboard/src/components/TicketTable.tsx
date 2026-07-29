import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS, formatDate } from '../lib/format';
import {
  STAFF_TICKET_COLUMNS,
  VIEWER_TICKET_COLUMNS,
  daysOutstandingFromAgencyReport,
  type SafeTicket,
  type StaffRole,
  type Ticket,
  type TicketStatus,
  type IssueCategory,
} from '../types/database';

const STATUS_OPTIONS: TicketStatus[] = ['baru', 'siasat', 'majlis_perbandaran', 'selesai', 'tangguh'];
const CATEGORY_OPTIONS: IssueCategory[] = ['jalan_berlubang', 'banjir', 'lampu_jalan', 'sampah', 'lain_lain'];

type TicketTableProps = {
  role: StaffRole;
};

function daysForRow(t: Ticket | SafeTicket): number | null {
  if ('days_outstanding' in t && typeof t.days_outstanding === 'number') {
    return t.days_outstanding;
  }
  return daysOutstandingFromAgencyReport(t.agency_reported_at);
}

function TicketTable({ role }: TicketTableProps) {
  const canSeePii = role === 'staff' || role === 'admin';
  const canTogglePhoto = role === 'staff' || role === 'admin';
  const [tickets, setTickets] = useState<(Ticket | SafeTicket)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | 'all'>('all');
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      if (canSeePii) {
        let query = supabase
          .from('tickets')
          .select(STAFF_TICKET_COLUMNS)
          .order('agency_reported_at', { ascending: true, nullsFirst: false });

        if (statusFilter !== 'all') query = query.eq('status', statusFilter);
        if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);

        const { data, error: queryError } = await query;
        if (cancelled) return;

        if (queryError) {
          setError(queryError.message);
          setTickets([]);
        } else {
          setError(null);
          setTickets((data ?? []) as Ticket[]);
        }
      } else {
        let query = supabase
          .from('staff_tickets_safe')
          .select(VIEWER_TICKET_COLUMNS)
          .order('agency_reported_at', { ascending: true, nullsFirst: false });

        if (statusFilter !== 'all') query = query.eq('status', statusFilter);
        if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);

        const { data, error: queryError } = await query;
        if (cancelled) return;

        if (queryError) {
          setError(queryError.message);
          setTickets([]);
        } else {
          setError(null);
          setTickets((data ?? []) as SafeTicket[]);
        }
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [statusFilter, categoryFilter, canSeePii]);

  // Longest-ignored first (highest days_outstanding); nulls last.
  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const da = daysForRow(a);
      const db = daysForRow(b);
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return db - da;
    });
  }, [tickets]);

  async function togglePhotoPublic(ticket: Ticket | SafeTicket, next: boolean) {
    if (!canTogglePhoto) return;
    setSavingId(ticket.id);
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ photo_public: next })
      .eq('id', ticket.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setTickets((prev) =>
        prev.map((row) => (row.id === ticket.id ? { ...row, photo_public: next } : row)),
      );
    }
    setSavingId(null);
  }

  return (
    <div className="ticket-table-wrapper">
      <div className="ticket-table__filters">
        <label>
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}>
            <option value="all">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as IssueCategory | 'all')}
          >
            <option value="all">All</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <span className="ticket-table__count">{sortedTickets.length} tickets</span>
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
              {canSeePii && <th>Reporter</th>}
              <th>Reported</th>
              <th>Hari sejak lapor</th>
              <th>Reports</th>
              <th>Public</th>
              <th>Terbitkan gambar</th>
            </tr>
          </thead>
          <tbody>
            {sortedTickets.map((t) => {
              const days = daysForRow(t);
              const hasPhoto = Boolean(t.photo_url);
              return (
                <tr key={t.id}>
                  <td>{t.ticket_number}</td>
                  <td>{CATEGORY_LABELS[t.category]}</td>
                  <td>{STATUS_LABELS[t.status]}</td>
                  <td>{PRIORITY_LABELS[t.adun_priority]}</td>
                  {canSeePii && (
                    <td>
                      {'name' in t ? (t.name ?? '—') : '—'}
                      <br />
                      <span className="ticket-table__phone">
                        {'whatsapp_number' in t ? t.whatsapp_number : ''}
                      </span>
                    </td>
                  )}
                  <td>{formatDate(t.created_at)}</td>
                  <td>{days == null ? '—' : days}</td>
                  <td>{t.upvote_count}</td>
                  <td>{t.is_public ? 'Yes' : 'No'}</td>
                  <td>
                    {hasPhoto ? (
                      <label className="ticket-table__toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(t.photo_public)}
                          disabled={!canTogglePhoto || savingId === t.id}
                          onChange={(e) => void togglePhotoPublic(t, e.target.checked)}
                        />
                        {t.photo_public ? 'Ya' : 'Tidak'}
                      </label>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default TicketTable;
