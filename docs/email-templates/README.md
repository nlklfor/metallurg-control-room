# METALLURG — Auth email templates

Branded HTML for the five Supabase Auth emails, matching the Control Room
look (monochrome, sharp corners, mono labels). Table-based layout with inline
CSS + an Outlook (VML) button, so they render in Gmail, Apple Mail, Outlook,
and mobile clients.

| File | Supabase template | Suggested subject |
|------|-------------------|-------------------|
| `magic-link.html`    | **Magic Link**            | `Sign in to METALLURG Control Room` |
| `confirm-signup.html`| **Confirm signup**        | `Confirm your METALLURG account` |
| `invite.html`        | **Invite user**           | `You've been invited to METALLURG Control Room` |
| `recovery.html`      | **Reset Password**        | `Reset your METALLURG password` |
| `email-change.html`  | **Change Email Address**  | `Confirm your new email address` |

## Installing

1. Supabase Dashboard → **Authentication → Emails → Templates**.
2. Pick a template, switch the editor to **source / HTML**, paste the matching
   file's contents, set the subject from the table above, **Save**.
3. Repeat for each template.

There is no build step — these are the final strings Supabase sends. Edit the
`.html` files here and re-paste when you change them (keep the repo copy as the
source of truth).

## How the link works (important)

These templates **do not** use Supabase's default `{{ .ConfirmationURL }}`.
That link relies on the PKCE code-verifier cookie being present wherever the
link opens, which breaks when the link lands on a different origin than where
sign-in was requested (localhost vs deployed) or when an email scanner touches
it first — this is what caused the "Authentication failed" error.

Instead the button points to:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<type>
```

which the app's `src/app/auth/confirm/route.ts` verifies with
`supabase.auth.verifyOtp({ type, token_hash })` — no cookie dependency, works
across devices. `type` per template: `magiclink`, `signup`, `invite`,
`recovery`, `email_change`.

### Required Supabase dashboard settings

Authentication → **URL Configuration**:

- **Site URL** = the URL you actually use the app at (e.g.
  `https://control.metallurg.store`, or `http://localhost:3000` while
  developing). `{{ .SiteURL }}` in the links resolves to this.
- **Redirect URLs** — add every origin you sign in from:
  `http://localhost:3000/**` and your production `https://…/**`.

If Site URL is wrong, the email link points at the wrong host and sign-in
fails regardless of the template.

## Template variables used

- `{{ .SiteURL }}` / `{{ .TokenHash }}` — build the verification link (above).
- `{{ .Token }}` — 6-digit one-time code. Shown as a "backup code" in
  `magic-link`, `confirm-signup`, `recovery`, `email-change`. The `/login`
  page's "enter the 6-digit code" input verifies it
  (`verifyOtp({ email, token, type: 'email' })`) — this is the scanner-proof
  path when the link itself gets consumed.
- `{{ .Email }}` — recipient address (footer).
- `{{ .NewEmail }}` — used only in `email-change.html`.

## Sending / SMTP

These are just the message bodies — delivery is whatever SMTP Supabase is
pointed at (Dashboard → **Authentication → Emails → SMTP Settings**). Your
current setup already delivers to Proton, so nothing to change. If delivery
ever gets flaky, the built-in sender is throttled (~a few/hour) and the fix is
custom SMTP (Resend, Postmark, SES — all have free tiers).

## Previewing

Open `_preview.html` in a browser to see all five rendered with sample data.
It is a local preview only — not something Supabase uses.
