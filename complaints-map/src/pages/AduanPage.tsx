import { Link, Navigate, Outlet, useOutletContext, useParams } from 'react-router-dom';
import { AduanFormProvider, useAduanForm } from '../context/AduanFormContext';
import type { AppOutletContext } from '../components/AppLayout';
import { t } from '../i18n';
import { isPhoneFieldAcceptable } from '../lib/phone';
import StepCategory from './aduan/StepCategory';
import StepLocation, { canProceedFromLocation } from './aduan/StepLocation';
import StepDetails from './aduan/StepDetails';
import StepPriorReport from './aduan/StepPriorReport';
import StepContact from './aduan/StepContact';
import StepReview from './aduan/StepReview';

const VALID_STEPS = new Set(['1', '2', '3', '4', '5', '6']);
const VALIDATION_ID = 'aduan-validation';

export default function AduanLayout() {
  const outletContext = useOutletContext<AppOutletContext>();

  return (
    <AduanFormProvider>
      <main className="app-main app-main--page">
        <Outlet context={outletContext} />
      </main>
    </AduanFormProvider>
  );
}

export function AduanIndexRedirect() {
  return <Navigate to="/aduan/1" replace />;
}

function DisabledNextButton({
  label,
  describedBy,
}: {
  label: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      className="btn-primary btn-primary--disabled"
      aria-disabled="true"
      aria-describedby={describedBy}
      onClick={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}

export function AduanStepPage() {
  const { langkah } = useParams<{ langkah: string }>();
  const { lang } = useOutletContext<AppOutletContext>();
  const { data } = useAduanForm();

  if (!langkah || !VALID_STEPS.has(langkah)) {
    return <Navigate to="/aduan/1" replace />;
  }

  const step = Number(langkah);
  const nextPath = step < 6 ? `/aduan/${step + 1}` : null;
  const prevPath = step > 1 ? `/aduan/${step - 1}` : null;

  let canNext = true;
  let blockedMessage: string | null = null;

  if (step === 1) {
    canNext = data.category != null;
    if (!canNext) blockedMessage = t(lang, 'step1NeedCategory');
  } else if (step === 2) {
    canNext = canProceedFromLocation(data);
    if (!canNext) blockedMessage = t(lang, 'step2NeedLocation');
  } else if (step === 3) {
    canNext = data.description.trim().length > 0;
    if (!canNext) blockedMessage = t(lang, 'step3NeedDescription');
  } else if (step === 4) {
    canNext = data.hasReportedBefore !== null;
    if (!canNext) blockedMessage = t(lang, 'step4NeedChoice');
  } else if (step === 5) {
    const phoneOk = isPhoneFieldAcceptable(data.contact_number);
    canNext = data.consentGiven && phoneOk;
    if (!data.consentGiven) blockedMessage = t(lang, 'step5NeedConsent');
    else if (!phoneOk) blockedMessage = t(lang, 'step5NeedPhoneFix');
  }

  return (
    <div className="page-panel aduan-step">
      <div
        className="aduan-step__progress-block"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={6}
        aria-label={t(lang, 'progressLabel')}
      >
        <p className="aduan-step__progress-text">
          {t(lang, 'progressText', { step })}
        </p>
        <div className="aduan-step__progress" aria-hidden="true">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <span
              key={n}
              className={
                n === step
                  ? 'aduan-step__progress-item aduan-step__progress-item--active'
                  : n < step
                    ? 'aduan-step__progress-item aduan-step__progress-item--done'
                    : 'aduan-step__progress-item'
              }
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <StepCategory lang={lang} errorId={VALIDATION_ID} hasError={!canNext} />
      )}
      {step === 2 && (
        <StepLocation lang={lang} errorId={VALIDATION_ID} hasError={!canNext} />
      )}
      {step === 3 && (
        <StepDetails lang={lang} errorId={VALIDATION_ID} hasError={!canNext} />
      )}
      {step === 4 && (
        <StepPriorReport lang={lang} errorId={VALIDATION_ID} hasError={!canNext} />
      )}
      {step === 5 && (
        <StepContact lang={lang} errorId={VALIDATION_ID} hasError={!canNext} />
      )}
      {step === 6 && <StepReview lang={lang} />}

      {step < 6 && (
        <p id={VALIDATION_ID} className="aduan-step__blocked" aria-live="polite">
          {blockedMessage ?? ''}
        </p>
      )}

      <nav className="aduan-step__nav" aria-label={t(lang, 'stepNav')}>
        {step < 6 &&
          (canNext && nextPath ? (
            <Link className="btn-primary" to={nextPath}>
              {t(lang, 'next')}
            </Link>
          ) : (
            <DisabledNextButton
              label={t(lang, 'next')}
              describedBy={VALIDATION_ID}
            />
          ))}

        {step === 1 ? (
          <Link className="btn-secondary" to="/">
            {t(lang, 'cancel')}
          </Link>
        ) : (
          <Link className="btn-secondary" to={prevPath!}>
            {t(lang, 'back')}
          </Link>
        )}
      </nav>
    </div>
  );
}
