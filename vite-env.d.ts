/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_CLAUDE_API_KEY?: string;
  readonly VITE_MISTRAL_API_KEY?: string;
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_STABILITY_API_KEY?: string;
  readonly VITE_REPLICATE_API_KEY?: string;
  readonly VITE_RESEND_API_KEY?: string;
  readonly VITE_SENDGRID_API_KEY?: string;
  readonly VITE_MAILGUN_API_KEY?: string;
  readonly VITE_LUMA_API_KEY?: string;
  readonly VITE_KLING_API_KEY?: string;
  readonly VITE_FAL_API_KEY?: string;
  readonly VITE_HUNTER_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
