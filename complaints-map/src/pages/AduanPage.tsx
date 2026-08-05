import { useRef, useState } from 'react';
import { Link, Navigate, Outlet, useOutletContext, useParams } from 'react-router-dom';
import { AduanFormProvider, useAduanForm } from '../context/AduanFormContext';
import type { AppOutletContext } from '../components/AppLayout';
import { t } from '../i18n';
import { isPhoneFieldAcceptable } from '../lib/phone';
import {
  ADUAN_STEP_COUNT,
  aduanPath,
  stepForLegacyParam,
  stepForSlug,
} from '../lib/aduanSteps';
import StepCategory from './aduan/StepCategory';
import StepLocation from './aduan/StepLocation';
import FeedbackLink from '../components/FeedbackLink';
import { canProceedFromLocation } from '../lib/location';
import StepDetails from './aduan/StepDetails';
import StepPriorReport from './aduan/StepPriorReport';
import StepContact from './aduan/StepContact';
import StepReview from './aduan/StepReview';

const VALIDATION_ID = 'aduan-validation';
const FIRST_STEP_PATH = aduanPath(1);

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
  return <Navigate to={FIRST_STEP_PATH} replace />;
}

/**
 * Stays focusable so a screen reader user can reach it and hear why they are
 * stuck; activating it reveals the reason rather than doing nothing.
 */
function BlockedPrimaryButton({
  label,
  describedBy,
  onAttempt,
}: {
  label: string;
  describedBy?: string;
  onAttempt: () => void;
}) {
  return (
    <button
      type="button"
      className="btn-primary btn-primary--disabled"
      aria-disabled="true"
      aria-describedby={describedBy}
      onClick={(e) => {
        e.preventDefault();
        onAttempt();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAttempt();
        }
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
  // Holding the step number rather than a boolean clears the attempt on
  // navigation, so a fresh step never opens already showing an error.
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  // Step 6 owns the Turnstile handshake, but its button lives in the shared
  // action bar, so it reports readiness up and exposes its handler here.
  const [reviewReady, setReviewReady] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const submitReviewRef = useRef<(() => void) | null>(null);

  const slugStep = langkah ? stepForSlug(langkah) : null;
  const legacyStep = langkah ? stepForLegacyParam(langkah) : null;

  if (!slugStep) {
    return <Navigate to={legacyStep ? aduanPath(legacyStep) : FIRST_STEP_PATH} replace />;
  }

  const step = slugStep;
  const isLastStep = step === ADUAN_STEP_COUNT;
  const nextPath = isLastStep ? null : aduanPath(step + 1);
  const prevPath = step > 1 ? aduanPath(step - 1) : null;

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
  } else if (isLastStep) {
    canNext = reviewReady;
    if (!canNext) blockedMessage = t(lang, 'turnstileRequired');
  }

  const showError = attemptedStep === step && !canNext;
  const primaryLabel = isLastStep
    ? reviewSubmitting
      ? t(lang, 'submitting')
      : t(lang, 'submitAduan')
    : t(lang, 'next');

  return (
    <div className="page-panel aduan-step">
      <div
        className="aduan-step__progress-block"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={ADUAN_STEP_COUNT}
        aria-label={t(lang, 'progressLabel')}
      >
        <p className="aduan-step__progress-text">
          {t(lang, 'progressText', { step })}
        </p>
        <div className="aduan-step__progress" aria-hidden="true">
          {Array.from({ length: ADUAN_STEP_COUNT }, (_, i) => i + 1).map((n) => (
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
        <StepCategory lang={lang} errorId={VALIDATION_ID} hasError={showError} />
      )}
      {step === 2 && (
        <StepLocation lang={lang} errorId={VALIDATION_ID} hasError={showError} />
      )}
      {step === 3 && (
        <StepDetails lang={lang} errorId={VALIDATION_ID} hasError={showError} />
      )}
      {step === 4 && (
        <StepPriorReport lang={lang} errorId={VALIDATION_ID} hasError={showError} />
      )}
      {step === 5 && (
        <StepContact lang={lang} errorId={VALIDATION_ID} hasError={showError} />
      )}
      {isLastStep && (
        <StepReview
          lang={lang}
          submitRef={submitReviewRef}
          onReadyChange={setReviewReady}
          onSubmittingChange={setReviewSubmitting}
        />
      )}

      <div className="aduan-step__actions">
        <p id={VALIDATION_ID} className="aduan-step__blocked" aria-live="polite">
          {showError ? blockedMessage : ''}
        </p>

        {/* Back sits first so reading and tab order follow the row itself. */}
        <nav className="aduan-step__nav" aria-label={t(lang, 'stepNav')}>
          {step === 1 ? (
            <Link className="btn-secondary" to="/">
              {t(lang, 'cancel')}
            </Link>
          ) : (
            <Link className="btn-secondary" to={prevPath!}>
              {t(lang, 'back')}
            </Link>
          )}

          {canNext ? (
            isLastStep ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => submitReviewRef.current?.()}
              >
                {primaryLabel}
              </button>
            ) : (
              <Link className="btn-primary" to={nextPath!}>
                {primaryLabel}
              </Link>
            )
          ) : (
            <BlockedPrimaryButton
              label={primaryLabel}
              describedBy={VALIDATION_ID}
              onAttempt={() => setAttemptedStep(step)}
            />
          )}
        </nav>

        <FeedbackLink lang={lang} variant="inline" />
      </div>
    </div>
  );
}
