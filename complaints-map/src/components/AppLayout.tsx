import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { t, type Lang } from '../i18n';
import { aduanPath } from '../lib/aduanSteps';
import BetaBanner from './BetaBanner';
import FeedbackLink from './FeedbackLink';

export type AppOutletContext = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

const LANG_STORAGE_KEY = 'aduan.lang';

// Temporarily hide donate links in header and footer for all languages.
const SHOW_DONATIONS_NAV = false;

const LANG_OPTIONS: { code: Lang; label: string }[] = [
  { code: 'ms', label: 'BM' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
  { code: 'ta', label: 'தமிழ்' },
];

function isLang(value: string | null): value is Lang {
  return value === 'ms' || value === 'en' || value === 'zh' || value === 'ta';
}

function readStoredLang(): Lang {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    // Private browsing can throw on access; the default is fine.
  }
  return 'ms';
}

export default function AppLayout() {
  const [lang, setLang] = useState<Lang>(readStoredLang);
  const { pathname } = useLocation();
  const showNavActions = !pathname.startsWith('/aduan');
  // Full legal footer on map/status; form routes keep a slim strip so the
  // technical-feedback link stays findable without the whole chrome.
  const isAduanRoute = pathname.startsWith('/aduan');

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Selection still applies for this session.
    }
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
          {showNavActions && (
            <>
              <Link to={aduanPath(1)} className="app-header__cta">
                {t(lang, 'buatAduan')}
              </Link>
              <Link
                to="/semak"
                className="app-header__cta app-header__cta--outline"
              >
                {t(lang, 'semakStatus')}
              </Link>
              {SHOW_DONATIONS_NAV && (
                <Link
                  to="/sumbangan"
                  className="app-header__cta app-header__cta--outline"
                >
                  {t(lang, 'donationsNav')}
                </Link>
              )}
            </>
          )}
          <div className="lang-toggle" role="group" aria-label={t(lang, 'language')}>
            {LANG_OPTIONS.map((option) => (
              <button
                key={option.code}
                type="button"
                lang={option.code}
                className={`lang-toggle__btn${lang === option.code ? ' lang-toggle__btn--active' : ''}`}
                onClick={() => setLang(option.code)}
                aria-pressed={lang === option.code}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <BetaBanner lang={lang} />

      <Outlet context={{ lang, setLang } satisfies AppOutletContext} />

      {isAduanRoute ? (
        <footer className="app-footer app-footer--compact">
          <FeedbackLink lang={lang} variant="block" />
        </footer>
      ) : (
        <footer className="app-footer">
          <p className="app-footer__managed">{t(lang, 'managedBy')}</p>
          <nav className="app-footer__links" aria-label="Legal">
            {SHOW_DONATIONS_NAV && (
              <Link to="/sumbangan">{t(lang, 'donationsNav')}</Link>
            )}
            <a href="/privacy">{t(lang, 'privacy')}</a>
            <a href="/terms">{t(lang, 'terms')}</a>
            <a href="/data-deletion">{t(lang, 'dataDeletion')}</a>
          </nav>
          <p className="app-footer__feedback">
            <FeedbackLink lang={lang} variant="block" />
          </p>
          <p className="app-footer__meta">{t(lang, 'footerMeta')}</p>
        </footer>
      )}
    </div>
  );
}
