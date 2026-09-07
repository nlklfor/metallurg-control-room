# METALLURG — Auth email templates

Branded HTML for the five Supabase Auth emails — "refined mono" METALLURG
styling (monochrome, sharp 1px borders, `//` labels, monospace code hero).
Table-based + inline CSS + Outlook VML button, so they render in Gmail, Apple
Mail, Outlook, and mobile clients. Forced light color-scheme.

| File | Supabase template | Suggested subject |
|------|-------------------|-------------------|
| `magic-link.html`    | **Magic Link**            | `Your METALLURG sign-in code` |
| `confirm-signup.html`| **Confirm signup**        | `Confirm your METALLURG account` |
| `invite.html`        | **Invite user**           | `You've been invited to METALLURG Control Room` |
| `recovery.html`      | **Reset Password**        | `Reset your METALLURG password` |
| `email-change.html`  | **Change Email Address**  | `Confirm your new email address` |

## The app uses a one-time code, not a link

`/login` requests a code (`signInWithOtp`) and verifies it
(`verifyOtp({ email, token, type: "email" })`). So **`magic-link.html` shows
only the code — no button, no link.** It's the one template that actually
fires in normal use.

Code length is whatever you set in Supabase → Authentication → Sign In /
Providers → **Email OTP Length** (6–10; default 6). The login form accepts the
whole range, so changing it won't break sign-in.

The other four still carry a **button + code** because those flows
(signup / invite / reset / email change) are link-driven. Their button points
at:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<type>
```

verified server-side by `src/app/auth/confirm/route.ts` via
`supabase.auth.verifyOtp({ type, token_hash })` — no PKCE cookie, works across
devices. `type` per template: `signup`, `invite`, `recovery`, `email_change`.
These four are dormant unless you enable passwords / multi-admin invites, but
they're kept consistent.

## Installing

1. Supabase Dashboard → **Authentication → Emails → Templates**.
2. Per template: switch the editor to **source / HTML**, paste the matching
   file, set the subject from the table above, **Save**.

Keep the repo copies as the source of truth — edit here, re-paste on change.

## Required Supabase settings

Authentication → **URL Configuration** (only matters for the four link-based
templates; the code flow doesn't need it):

- **Site URL** = the URL you use the app at (`https://…` in prod, or
  `http://localhost:3000` in dev). `{{ .SiteURL }}` resolves to this.
- **Redirect URLs** — add `http://localhost:3000/**` and your prod `https://…/**`.

## Template variables

- `{{ .Token }}` — the one-time code (6–10 digits per your settings). Hero of `magic-link`; secondary in the
  other code-bearing templates.
- `{{ .SiteURL }}` / `{{ .TokenHash }}` — build the `/auth/confirm` link.
- `{{ .Email }}` — recipient (shown in body + footer).
- `{{ .NewEmail }}` — `email-change.html` only.

The preheader of `magic-link.html` includes the code so it shows in the inbox
preview line — remove that `<div style="display:none…">` line if you'd rather
it not appear in notifications.

## Sending / SMTP

These are just the bodies — delivery is whatever SMTP Supabase points at
(Authentication → Emails → SMTP Settings). Your setup already delivers to
Proton. If it gets flaky, the built-in sender is throttled (~a few/hour) — fix
is custom SMTP (Resend, Postmark, SES — all free-tier).

## Previewing

`node docs/email-templates/build-preview.mjs` regenerates `_preview.html`
(all five, sample data). Local preview only.
