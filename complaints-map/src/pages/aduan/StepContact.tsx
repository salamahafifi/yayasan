import { useAduanForm } from '../../context/AduanFormContext';
import { useStepHeadingFocus } from '../../lib/useStepHeadingFocus';
import { isPhoneFieldAcceptable } from '../../lib/phone';
import { t, type Lang } from '../../i18n';

type Props = {
  lang: Lang;
  errorId?: string;
  hasError?: boolean;
};

const PHONE_ERROR_ID = 'aduan-phone-error';

export default function StepContact({ lang, errorId, hasError }: Props) {
  const { data, update } = useAduanForm();
  const headingRef = useStepHeadingFocus<HTMLHeadingElement>(5);
  const consentId = 'aduan-consent';

  const consentParts = t(lang, 'consentLabel').split('{privacyLink}');
  const phoneInvalid =
    data.contact_number.trim().length > 0 && !isPhoneFieldAcceptable(data.contact_number);

  return (
    <div className="aduan-step__content">
      <h2 ref={headingRef} tabIndex={-1} className="aduan-step__heading">
        {t(lang, 'step5Heading')}
      </h2>

      <div className="field">
        <label className="field__label" htmlFor="aduan-name">
          {t(lang, 'nameLabel')}{' '}
          <span className="field__optional">({t(lang, 'nameOptional')})</span>
        </label>
        <input
          id="aduan-name"
          type="text"
          className="field__input"
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder={t(lang, 'namePlaceholder')}
          autoComplete="name"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="aduan-phone">
          {t(lang, 'phoneLabel')}{' '}
          <span className="field__optional">({t(lang, 'nameOptional')})</span>
        </label>
        <input
          id="aduan-phone"
          type="tel"
          className="field__input"
          value={data.contact_number}
          onChange={(e) => update({ contact_number: e.target.value })}
          placeholder={t(lang, 'phonePlaceholder')}
          autoComplete="tel"
          inputMode="tel"
          aria-invalid={phoneInvalid || undefined}
          aria-describedby={
            [phoneInvalid ? PHONE_ERROR_ID : null, 'aduan-phone-note']
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
        <p id="aduan-phone-note" className="field__note">
          {t(lang, 'phoneNote')}
        </p>
        <p
          id={PHONE_ERROR_ID}
          className="field__error"
          aria-live="polite"
        >
          {phoneInvalid ? t(lang, 'phoneInvalid') : ''}
        </p>
      </div>

      <div className="consent-field">
        <label className="consent-field__label" htmlFor={consentId}>
          <input
            id={consentId}
            type="checkbox"
            className="consent-field__input"
            checked={data.consentGiven}
            onChange={(e) => update({ consentGiven: e.target.checked })}
            aria-describedby={hasError && errorId ? errorId : undefined}
            required
          />
          <span>
            {consentParts[0]}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              {t(lang, 'consentPrivacyLink')}
            </a>
            {consentParts[1] ?? ''}
          </span>
        </label>
      </div>
    </div>
  );
}
