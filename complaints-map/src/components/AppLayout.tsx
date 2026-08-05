import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { t, type Lang } from '../i18n';

export type AppOutletContext = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

export default function AppLayout() {
  const [lang, setLang] = useState<Lang>('ms');
  const { pathname } = useLocation();
  const showBuatAduan = pathname === '/' || pathname.startsWith('/semak');

  useEffect(() => {
    document.documentElement.lang = lang === 'ms' ? 'ms' : lang;
  }, [lang]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <Link to="/" className="app-header__title">
            {t(lang, 'brandTitle')}{' '}
            <span className="app-header__brand-accent">{t(lang, 'brandName')}</span>
          </Link>
        </div>
        <div className="app-header__actions">
          {showBuatAduan && (
            <Link to="/aduan/1" className="app-header__cta">
              {t(lang, 'buatAduan')}
            </Link>
          )}
          <div className="lang-toggle" role="group" aria-label={t(lang, 'language')}>
            <button
              type="button"
              className={`lang-toggle__btn${lang === 'en' ? ' lang-toggle__btn--active' : ''}`}
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
            >
              EN
            </button>
            <button
              type="button"
              className={`lang-toggle__btn${lang === 'ms' ? ' lang-toggle__btn--active' : ''}`}
              onClick={() => setLang('ms')}
              aria-pressed={lang === 'ms'}
            >
              BM
            </button>
          </div>
        </div>
      </header>

      <Outlet context={{ lang, setLang } satisfies AppOutletContext} />

      <footer className="app-footer">
        <p className="app-footer__managed">{t(lang, 'managedBy')}</p>
        <nav className="app-footer__links" aria-label="Legal">
          <a href="/privacy">{t(lang, 'privacy')}</a>
          <a href="/terms">{t(lang, 'terms')}</a>
          <a href="/data-deletion">{t(lang, 'dataDeletion')}</a>
          <Link to="/semak">{t(lang, 'trackReport')}</Link>
        </nav>
        <p className="app-footer__meta">{t(lang, 'footerMeta')}</p>
      </footer>
    </div>
  );
}
