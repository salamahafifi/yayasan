import { useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '../components/AppLayout';
import { t } from '../i18n';

export default function DonationsPage() {
  const { lang } = useOutletContext<AppOutletContext>();

  return (
    <main className="app-main app-main--page">
      <div className="page-panel donations-page">
        <h1 className="donations-page__title">{t(lang, 'donationsTitle')}</h1>
        <p className="donations-page__intro">{t(lang, 'donationsIntro')}</p>

        <section className="donations-page__section" aria-labelledby="donations-bank-heading">
          <h2 id="donations-bank-heading">{t(lang, 'donationsBankHeading')}</h2>
          <dl className="donations-page__details">
            <div>
              <dt>{t(lang, 'donationsBankName')}</dt>
              <dd>{t(lang, 'donationsBankNameValue')}</dd>
            </div>
            <div>
              <dt>{t(lang, 'donationsAccountName')}</dt>
              <dd>{t(lang, 'donationsAccountNameValue')}</dd>
            </div>
            <div>
              <dt>{t(lang, 'donationsAccountNumber')}</dt>
              <dd>{t(lang, 'donationsAccountNumberValue')}</dd>
            </div>
          </dl>
        </section>

        <section className="donations-page__section" aria-labelledby="donations-qr-heading">
          <h2 id="donations-qr-heading">{t(lang, 'donationsQrHeading')}</h2>
          <figure className="donations-page__qr">
            <img
              src="/donations/maybank-qr.png"
              alt={t(lang, 'donationsQrAlt')}
              width={280}
              height={280}
            />
          </figure>
        </section>

        <p className="donations-page__note">{t(lang, 'donationsNote')}</p>
      </div>
    </main>
  );
}
