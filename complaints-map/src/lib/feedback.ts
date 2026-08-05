/**
 * Channel for problems with the website itself. Nothing sent here reaches the
 * ticket system, so the surrounding copy has to say so plainly.
 */
const PREFILL = 'Maklum balas borang aduan: ';

const rawNumber = import.meta.env.VITE_FEEDBACK_WHATSAPP?.replace(/\D/g, '') ?? '';

/** Unset means no link at all, rather than a wa.me URL that goes nowhere. */
export const feedbackWhatsAppUrl: string | null = rawNumber
  ? `https://wa.me/${rawNumber}?text=${encodeURIComponent(PREFILL)}`
  : null;
