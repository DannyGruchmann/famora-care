export interface Environment {
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** Empty means: no CAPTCHA configured — the register and forgot-password forms skip it. */
  turnstileSiteKey: string;
}
