import { useOutletContext } from 'react-router-dom';
import TicketLookup from '../components/TicketLookup';
import type { AppOutletContext } from '../components/AppLayout';

export default function SemakPage() {
  const { lang } = useOutletContext<AppOutletContext>();

  return (
    <main className="app-main app-main--page">
      <div className="page-panel">
        <TicketLookup lang={lang} />
      </div>
    </main>
  );
}
