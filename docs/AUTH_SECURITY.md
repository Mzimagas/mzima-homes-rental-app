Auth & Security Guidelines

- Supabase Password Policy (Dashboard → Authentication → Policies):
  - Minimum length: 10
  - Require 3 of 4 character classes
  - Disallow common passwords (enable breached password protection if available)
  - Email confirmation required for new users

- Sessions:
  - Prefer cookie-based sessions via @supabase/auth-helpers-nextjs for SSR parity
  - HttpOnly cookies; SameSite=Lax; Secure in production

- CSRF:
  - Use double-submit cookie pattern for custom POST API routes
  - Enforce header x-csrf-token === csrf-token cookie

- Rate limiting & CAPTCHA:
  - Apply per-IP and per-identifier limits on login/forgot/resend
  - Use a distributed store (e.g., Upstash) in production
  - Add CAPTCHA (Cloudflare Turnstile) for high-risk endpoints

- Errors & UX:
  - Avoid user enumeration; generic auth errors
  - Use centralized mapping for messages

- Logging:
  - Redact email, never log tokens
  - No verbose auth logs in production

- MFA:
  - Use Supabase MFA APIs for TOTP enrollment and challenge

- Testing:
  - Unit tests for validators and context
  - E2E tests for login/signup/reset/MFA

