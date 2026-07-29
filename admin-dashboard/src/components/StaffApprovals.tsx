import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/format';
import type { StaffProfile, StaffRole } from '../types/database';

const ROLE_OPTIONS: StaffRole[] = ['viewer', 'staff', 'admin'];

function StaffApprovals() {
  const [rows, setRows] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('staff')
      .select('user_id, name, email, role, active, created_at')
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setRows([]);
    } else {
      setError(null);
      setRows((data ?? []) as StaffProfile[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateRow(userId: string, patch: Partial<Pick<StaffProfile, 'active' | 'role'>>) {
    setSavingId(userId);
    const { error: updateError } = await supabase.from('staff').update(patch).eq('user_id', userId);
    setSavingId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
  }

  return (
    <div className="staff-approvals">
      <h2 className="staff-approvals__title">Kelulusan staf</h2>
      {loading && <p className="status-text">Loading…</p>}
      {error && <p className="status-text status-text--error">{error}</p>}

      {!loading && !error && (
        <table className="ticket-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Active</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.user_id}>
                <td>{row.name}</td>
                <td>{row.email ?? '—'}</td>
                <td>
                  <select
                    value={row.role}
                    disabled={savingId === row.user_id}
                    onChange={(e) => void updateRow(row.user_id, { role: e.target.value as StaffRole })}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <label className="staff-approvals__active">
                    <input
                      type="checkbox"
                      checked={row.active}
                      disabled={savingId === row.user_id}
                      onChange={(e) => void updateRow(row.user_id, { active: e.target.checked })}
                    />
                    {row.active ? 'Active' : 'Pending'}
                  </label>
                </td>
                <td>{formatDate(row.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default StaffApprovals;
