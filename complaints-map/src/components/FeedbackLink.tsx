import { feedbackWhatsAppUrl } from '../lib/feedback';
import { t, type Lang } from '../i18n';

type Props = {
  lang: Lang;
  /**
   * The footer spells the caveat out; the form card repeats only the link, so
   * the two placements do not stack the same paragraph twice on /aduan/*.
   * The caveat still reaches assistive tech there through the label.
   */
  variant?: 'inline' | 'block';
};

export default function FeedbackLink({ lang, variant = 'inline' }: Props) {
  if (!feedbackWhatsAppUrl) return null;

  const label = t(lang, 'feedbackLink');
  const caveat = t(lang, 'feedbackCaveat');

  return (
    <span className={`feedback-link feedback-link--${variant}`}>
      <a
        href={feedbackWhatsAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="feedback-link__anchor"
        title={variant === 'inline' ? caveat : undefined}
        aria-label={variant === 'inline' ? `${label} ${caveat}` : undefined}
      >
        {label}
      </a>
      {variant === 'block' && (
        <span className="feedback-link__caveat">{caveat}</span>
      )}
    </span>
  );
}
