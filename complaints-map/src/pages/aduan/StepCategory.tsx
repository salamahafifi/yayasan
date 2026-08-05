import type { IssueCategory } from '../../types/database';
import { categoryColor } from '../../lib/tokens';
import { useAduanForm } from '../../context/AduanFormContext';
import { useStepHeadingFocus } from '../../lib/useStepHeadingFocus';
import { t, type Lang } from '../../i18n';

const CATEGORIES: IssueCategory[] = [
  'jalan_berlubang',
  'lampu_jalan',
  'semak',
  'sampah',
  'longkang_tersumbat',
  'gangguan_haiwan',
  'lain_lain',
];

type StepCategoryProps = {
  lang: Lang;
  errorId?: string;
  hasError?: boolean;
};

export default function StepCategory({ lang, errorId, hasError }: StepCategoryProps) {
  const { data, update } = useAduanForm();
  const headingRef = useStepHeadingFocus<HTMLSpanElement>(1);

  return (
    <div className="aduan-step__content">
      <fieldset
        className="category-fieldset"
        aria-describedby={hasError && errorId ? errorId : undefined}
      >
        <legend className="aduan-step__legend">
          <span ref={headingRef} tabIndex={-1} className="aduan-step__heading">
            {t(lang, 'step1Heading')}
          </span>
        </legend>

        <div className="category-list">
          {CATEGORIES.map((value) => {
            const selected = data.category === value;
            const inputId = `category-${value}`;
            return (
              <label
                key={value}
                htmlFor={inputId}
                className={`category-option${selected ? ' category-option--selected' : ''}`}
              >
                <input
                  id={inputId}
                  type="radio"
                  name="category"
                  value={value}
                  className="category-option__input"
                  checked={selected}
                  onChange={() =>
                    update({
                      category: value,
                      ...(value !== 'lain_lain' ? { otherCategoryLabel: '' } : {}),
                    })
                  }
                />
                <span
                  className="category-option__dot"
                  style={{ backgroundColor: categoryColor(value) }}
                  aria-hidden="true"
                />
                <span className="category-option__label">
                  {t(lang, `category_${value}`)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {data.category === 'lain_lain' && (
        <div className="field">
          <label className="field__label" htmlFor="other-category-label">
            {t(lang, 'otherCategoryLabel')}
          </label>
          <input
            id="other-category-label"
            type="text"
            className="field__input"
            maxLength={80}
            value={data.otherCategoryLabel}
            onChange={(e) => update({ otherCategoryLabel: e.target.value.slice(0, 80) })}
            placeholder={t(lang, 'otherCategoryPlaceholder')}
          />
          <span className="field__hint">{data.otherCategoryLabel.length}/80</span>
        </div>
      )}
    </div>
  );
}
