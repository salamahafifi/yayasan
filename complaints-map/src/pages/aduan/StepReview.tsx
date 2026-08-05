import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAduanForm } from '../../context/AduanFormContext';
import { useStepHeadingFocus } from '../../lib/useStepHeadingFocus';
import { formatCategoryLabel, t, type Lang } from '../../i18n';
import { parseMalaysianMobile } from '../../lib/phone';

const TURNSTILE_SITE_KEY = '0x4AAAAAAEG4H_wn2RvNm3EG';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

type ReviewRow = {
  label: string;
  value: string;
  step: number;
};

type Props = {
  lang: Lang;
};

export default function StepReview({ lang }: Props) {
  const { data, setLastTicketNumber } = useAduanForm();
  const headingRef = useStepHeadingFocus<HTMLHeadingElement>(6);
  const navigate = useNavigate();
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function mountWidget() {
      if (cancelled || !turnstileRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(null),
        'error-callback': () => setTurnstileToken(null),
      });
    }

    if (window.turnstile) {
      mountWidget();
      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }
      };
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-aduan-turnstile]',
    );
    if (existing) {
      existing.addEventListener('load', mountWidget);
      return () => {
        cancelled = true;
        existing.removeEventListener('load', mountWidget);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.dataset.aduanTurnstile = 'true';
    script.addEventListener('load', mountWidget);
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener('load', mountWidget);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, []);

  const empty = t(lang, 'reviewEmpty');
  const rows: ReviewRow[] = [
    {
      label: t(lang, 'reviewCategory'),
      value: data.category ? formatCategoryLabel(data.category, lang) : empty,
      step: 1,
    },
  ];

  if (data.category === 'lain_lain' && data.otherCategoryLabel.trim()) {
    rows.push({
      label: t(lang, 'reviewOtherCategory'),
      value: data.otherCategoryLabel.trim(),
      step: 1,
    });
  }

  rows.push({
    label: t(lang, 'reviewCoordinates'),
    value:
      data.latitude != null && data.longitude != null
        ? `${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`
        : empty,
    step: 2,
  });
  rows.push({
    label: t(lang, 'reviewAddress'),
    value: data.addressText.trim() || empty,
    step: 2,
  });
  rows.push({
    label: t(lang, 'reviewDescription'),
    value: data.description.trim() || empty,
    step: 3,
  });
  rows.push({
    label: t(lang, 'reviewReported'),
    value:
      data.hasReportedBefore === true
        ? t(lang, 'reviewReportedYes')
        : data.hasReportedBefore === false
          ? t(lang, 'reviewReportedNo')
          : empty,
    step: 4,
  });

  if (data.hasReportedBefore === true) {
    rows.push({
      label: t(lang, 'reviewAgency'),
      value: data.agency.trim() || empty,
      step: 4,
    });
    rows.push({
      label: t(lang, 'reviewAgencyRef'),
      value: data.agency_ref.trim() || empty,
      step: 4,
    });
    rows.push({
      label: t(lang, 'reviewAgencyDate'),
      value: data.agency_reported_at || empty,
      step: 4,
    });
  }

  rows.push({
    label: t(lang, 'reviewName'),
    value: data.name.trim() || empty,
    step: 5,
  });
  rows.push({
    label: t(lang, 'reviewPhone'),
    value: data.contact_number.trim() || empty,
    step: 5,
  });
  rows.push({
    label: t(lang, 'reviewConsent'),
    value: data.consentGiven ? t(lang, 'reviewConsentYes') : empty,
    step: 5,
  });

  async function handleSubmit() {
    if (!turnstileToken || submitting) return;

    const phoneParsed = parseMalaysianMobile(data.contact_number);
    if (!phoneParsed.ok) {
      setSubmitError(t(lang, 'phoneInvalid'));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/submit-web-complaint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          honeypot,
          turnstile_token: turnstileToken,
          category: data.category,
          description: data.description.trim(),
          latitude: data.latitude,
          longitude: data.longitude,
          address_text: data.addressText.trim() || null,
          name: data.name.trim() || null,
          contact_number: phoneParsed.empty ? null : phoneParsed.e164,
          agency: data.hasReportedBefore ? data.agency.trim() || null : null,
          agency_ref: data.hasReportedBefore ? data.agency_ref.trim() || null : null,
          agency_reported_at: data.hasReportedBefore
            ? data.agency_reported_at || null
            : null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ticket_number) {
        setSubmitError(t(lang, 'submitError'));
        setTurnstileToken(null);
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
        setSubmitting(false);
        return;
      }

      setLastTicketNumber(json.ticket_number as string);
      navigate('/aduan/berjaya', {
        replace: true,
        state: { ticket_number: json.ticket_number },
      });
    } catch {
      setSubmitError(t(lang, 'submitErrorNetwork'));
      setSubmitting(false);
    }
  }

  const canSubmit = Boolean(turnstileToken) && !submitting;

  return (
    <div className="aduan-step__content">
      <h2 ref={headingRef} tabIndex={-1} className="aduan-step__heading">
        {t(lang, 'step6Heading')}
      </h2>

      <ul className="review-list">
        {rows.map((row) => (
          <li key={`${row.step}-${row.label}`} className="review-list__item">
            <div className="review-list__text">
              <span className="review-list__label">{row.label}</span>
              <span className="review-list__value">{row.value}</span>
            </div>
            <Link className="review-list__edit" to={`/aduan/${row.step}`}>
              {t(lang, 'reviewEdit')}
            </Link>
          </li>
        ))}
      </ul>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="aduan-website">{t(lang, 'honeypotLabel')}</label>
        <input
          id="aduan-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="turnstile-wrap">
        <div ref={turnstileRef} />
      </div>

      {submitError && (
        <p className="field__error" role="alert" aria-live="assertive">
          {submitError}
        </p>
      )}

      {canSubmit ? (
        <button
          type="button"
          className="btn-primary aduan-submit"
          onClick={() => void handleSubmit()}
        >
          {submitting ? t(lang, 'submitting') : t(lang, 'submitAduan')}
        </button>
      ) : (
        <button
          type="button"
          className="btn-primary btn-primary--disabled aduan-submit"
          aria-disabled="true"
          aria-describedby={!turnstileToken ? 'turnstile-hint' : undefined}
          onClick={(e) => e.preventDefault()}
        >
          {submitting ? t(lang, 'submitting') : t(lang, 'submitAduan')}
        </button>
      )}
      {!turnstileToken && (
        <p id="turnstile-hint" className="field__hint">
          {t(lang, 'turnstileRequired')}
        </p>
      )}
    </div>
  );
}
