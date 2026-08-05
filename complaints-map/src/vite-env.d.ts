/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** WhatsApp number for website problems, in E.164 without the plus. */
  readonly VITE_FEEDBACK_WHATSAPP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
