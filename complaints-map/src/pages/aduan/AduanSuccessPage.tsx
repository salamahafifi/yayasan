import { Link, Navigate, useLocation, useOutletContext } from 'react-router-dom';
import { useAduanForm } from '../../context/AduanFormContext';
import { t } from '../../i18n';
import type { AppOutletContext } from '../../components/AppLayout';

type SuccessState = {
  ticket_number?: string;
};

export default function AduanSuccessPage() {
  const { lang } = useOutletContext<AppOutletContext>();
  const location = useLocation();
  const { lastTicketNumber, reset } = useAduanForm();
  const state = (location.state as SuccessState | null) ?? null;
  const ticketNumber = state?.ticket_number || lastTicketNumber;

  if (!ticketNumber) {
    return <Navigate to="/aduan/1" replace />;
  }

  return (
    <div className="page-panel aduan-success">
      <h1 className="aduan-step__heading">{t(lang, 'successHeading')}</h1>
      <p className="aduan-success__label">{t(lang, 'successTicketLabel')}</p>
      <p className="aduan-success__ticket">{ticketNumber}</p>
      <p className="aduan-step__body">{t(lang, 'successSaveHint')}</p>
      <p className="aduan-success__private">{t(lang, 'successPrivateHint')}</p>
      <div className="aduan-step__nav">
        <Link
          className="btn-primary"
          to="/semak"
          onClick={() => reset()}
        >
          {t(lang, 'successSemakLink')}
        </Link>
        <Link className="btn-secondary" to="/" onClick={() => reset()}>
          {t(lang, 'successHomeLink')}
        </Link>
      </div>
    </div>
  );
}
