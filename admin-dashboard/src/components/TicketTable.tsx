import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS, formatDate } from '../lib/format';
import {
  STAFF_TICKET_COLUMNS,
  VIEWER_TICKET_COLUMNS,
  daysOutstandingFromAgencyReport,
  type IssueCategory,
  type SafeTicket,
  type StaffRole,
  type Ticket,
  type TicketStatus,
} from '../types/database';

const STATUS_OPTIONS: TicketStatus[] = ['baru', 'siasat', 'majlis_perbandaran', 'selesai', 'tangguh'];
const CATEGORY_OPTIONS: IssueCategory[] = [
  'jalan_berlubang',
  'lampu_jalan',
  'semak',
  'sampah',
  'longkang_tersumbat',
  'gangguan_haiwan',
  'lain_lain',
];

type TicketRow = Ticket | SafeTicket;
type LocationFilter = 'all' | 'missing' | 'geocoded';

type TicketTableProps = {
  role: StaffRole;
  refreshKey: number;
  onSelect: (ticketId: number) => void;
};

function daysForRow(ticket: TicketRow): number | null {
  if ('days_outstanding' in ticket && typeof ticket.days_outstanding === 'number') {
    return ticket.days_outstanding;
  }
  return daysOutstandingFromAgencyReport(ticket.agency_reported_at);
}

function TicketTable({ role, refreshKey, onSelect }: TicketTableProps) {
  const canSeePii = role === 'staff' || role === 'admin';
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = canSeePii
        ? await supabase
          .from('tickets')
          .select(STAFF_TICKET_COLUMNS)
          .order('agency_reported_at', { ascending: true, nullsFirst: false })
        : await supabase
          .from('staff_tickets_safe')
          .select(VIEWER_TICKET_COLUMNS)
          .order('agency_reported_at', { ascending: true, nullsFirst: false });
      if (cancelled) return;
      setError(result.error?.message ?? null);
      setTickets(result.error ? [] : ((result.data ?? []) as unknown as TicketRow[]));
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [canSeePii, refreshKey]);

  const sortedTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;
        if (locationFilter === 'missing' && !ticket.needs_location) return false;
        if (locationFilter === 'geocoded' && ticket.location_source !== 'geocoded') return false;
        return true;
      }).sort((a, b) => {
        const first = daysForRow(a);
        const second = daysForRow(b);
        if (first == null && second == null) return 0;
        if (first == null) return 1;
        if (second == null) return -1;
        return second - first;
      }),
    [tickets, statusFilter, categoryFilter, locationFilter],
  );

  return (
    <section className="ticket-table-wrapper">
      <div className="ticket-table__filters">
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TicketStatus | 'all')}>
            <option value="all">All</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as IssueCategory | 'all')}
          >
            <option value="all">All</option>
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
            ))}
          </select>
        </label>
        <label>
          Location
          <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value as LocationFilter)}>
            <option value="all">All</option>
            <option value="missing">Needs location</option>
            <option value="geocoded">Geocoded — verify</option>
          </select>
        </label>
        <span className="ticket-table__count">{sortedTickets.length} tickets</span>
      </div>

      {loading && <p className="status-text">Loading…</p>}
      {error && <p className="status-text status-text--error">{error}</p>}

      {!loading && !error && (
        <div className="ticket-table__scroll">
          <table className="ticket-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Category</th>
                <th>Status</th>
                <th>Priority</th>
                {canSeePii && <th>Reporter</th>}
                <th>Reported</th>
                <th>Days</th>
                <th>Reports</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {sortedTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="ticket-table__row"
                  tabIndex={0}
                  onClick={() => onSelect(ticket.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onSelect(ticket.id);
                  }}
                >
                  <td>{ticket.ticket_number}</td>
                  <td>{CATEGORY_LABELS[ticket.category]}</td>
                  <td>{STATUS_LABELS[ticket.status]}</td>
                  <td>{PRIORITY_LABELS[ticket.adun_priority]}</td>
                  {canSeePii && (
                    <td>
                      {'name' in ticket ? (ticket.name ?? '—') : '—'}
                      <br />
                      <span className="ticket-table__phone">
                        {'contact_number' in ticket ? (ticket.contact_number ?? '') : ''}
                      </span>
                    </td>
                  )}
                  <td>{formatDate(ticket.created_at)}</td>
                  <td>{daysForRow(ticket) ?? '—'}</td>
                  <td>{ticket.upvote_count}</td>
                  <td>
                    {ticket.needs_location
                      ? <span className="location-flag location-flag--missing">Needs pin</span>
                      : ticket.location_source === 'geocoded'
                        ? <span className="location-flag location-flag--verify">Verify geocode</span>
                        : 'Set'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default TicketTable;
