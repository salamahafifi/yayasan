import { useAduanForm } from '../../context/AduanFormContext';
import { useStepHeadingFocus } from '../../lib/useStepHeadingFocus';
import { t, type Lang } from '../../i18n';

type Props = {
  lang: Lang;
  errorId?: string;
  hasError?: boolean;
};

export default function StepDetails({ lang, errorId, hasError }: Props) {
  const { data, update } = useAduanForm();
  const headingRef = useStepHeadingFocus<HTMLHeadingElement>(3);
  const fieldId = 'aduan-description';

  return (
    <div className="aduan-step__content">
      <h2 ref={headingRef} tabIndex={-1} className="aduan-step__heading">
        {t(lang, 'step3Heading')}
      </h2>

      <div className="field">
        <label className="field__label" htmlFor={fieldId}>
          {t(lang, 'step3Label')}
        </label>
        <textarea
          id={fieldId}
          className="field__input field__textarea"
          rows={6}
          maxLength={2000}
          required
          value={data.description}
          onChange={(e) => update({ description: e.target.value.slice(0, 2000) })}
          placeholder={t(lang, 'step3Placeholder')}
          aria-describedby={hasError && errorId ? errorId : undefined}
        />
        <span className="field__hint" aria-live="polite">
          {t(lang, 'charCounter', { count: data.description.length })}
        </span>
      </div>
    </div>
  );
}
