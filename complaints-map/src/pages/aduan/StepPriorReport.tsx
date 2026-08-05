import { useAduanForm } from '../../context/AduanFormContext';
import { useStepHeadingFocus } from '../../lib/useStepHeadingFocus';
import { t, type Lang } from '../../i18n';

const QUICK_AGENCIES = ['MBJB', 'IWK', 'SAJ', 'TNB'] as const;

type Props = {
  lang: Lang;
  errorId?: string;
  hasError?: boolean;
};

export default function StepPriorReport({ lang, errorId, hasError }: Props) {
  const { data, update } = useAduanForm();
  const headingRef = useStepHeadingFocus<HTMLHeadingElement>(4);

  function chooseNo() {
    update({
      hasReportedBefore: false,
      agency: '',
      agency_ref: '',
      agency_reported_at: '',
    });
  }

  function chooseYes() {
    update({ hasReportedBefore: true });
  }

  return (
    <div className="aduan-step__content">
      <h2 ref={headingRef} tabIndex={-1} className="aduan-step__heading">
        {t(lang, 'step4Heading')}
      </h2>

      <div
        className="choice-list"
        role="group"
        aria-label={t(lang, 'step4Heading')}
        aria-describedby={hasError && errorId ? errorId : undefined}
      >
        <button
          type="button"
          className={`location-option${data.hasReportedBefore === false ? ' location-option--selected' : ''}`}
          aria-pressed={data.hasReportedBefore === false}
          onClick={chooseNo}
        >
          {t(lang, 'step4No')}
        </button>
        <button
          type="button"
          className={`location-option${data.hasReportedBefore === true ? ' location-option--selected' : ''}`}
          aria-pressed={data.hasReportedBefore === true}
          onClick={chooseYes}
        >
          {t(lang, 'step4Yes')}
        </button>
      </div>

      {data.hasReportedBefore === true && (
        <div className="prior-report-fields">
          <div className="field">
            <label className="field__label" htmlFor="agency-name">
              {t(lang, 'agencyNameLabel')}
            </label>
            <input
              id="agency-name"
              type="text"
              className="field__input"
              value={data.agency}
              onChange={(e) => update({ agency: e.target.value })}
              placeholder={t(lang, 'agencyNamePlaceholder')}
            />
            <div className="quick-picks" role="group" aria-label={t(lang, 'agencyQuickPick')}>
              {QUICK_AGENCIES.map((agency) => (
                <button
                  key={agency}
                  type="button"
                  className={`quick-pick${data.agency === agency ? ' quick-pick--selected' : ''}`}
                  onClick={() => update({ agency })}
                >
                  {agency}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="agency-ref">
              {t(lang, 'agencyRefLabel')}
            </label>
            <input
              id="agency-ref"
              type="text"
              className="field__input"
              value={data.agency_ref}
              onChange={(e) => update({ agency_ref: e.target.value })}
              placeholder={t(lang, 'agencyRefPlaceholder')}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="agency-date">
              {t(lang, 'agencyDateLabel')}
            </label>
            <input
              id="agency-date"
              type="date"
              className="field__input"
              value={data.agency_reported_at}
              onChange={(e) => update({ agency_reported_at: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
