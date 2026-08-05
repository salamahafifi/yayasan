import { useState } from 'react';
import { t, type Lang } from '../i18n';

/** sessionStorage, not localStorage: the notice should return on a new visit
 *  for as long as the site is in beta. */
const DISMISS_KEY = 'aduan.betaDismissed';

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export default function BetaBanner({ lang }: { lang: Lang }) {
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed) return null;

  function dismiss() {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Hiding it for this render is still the right outcome.
    }
    setDismissed(true);
  }

  return (
    <div className="beta-banner" role="status">
      <p className="beta-banner__text">{t(lang, 'betaNotice')}</p>
      <button
        type="button"
        className="beta-banner__dismiss"
        onClick={dismiss}
        aria-label={t(lang, 'betaDismiss')}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
