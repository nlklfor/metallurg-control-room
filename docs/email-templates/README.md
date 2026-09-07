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

## Template variables used

Supabase substitutes these (Go template syntax) before sending:

- `{{ .ConfirmationURL }}` — the action link. **Unchanged from the Supabase
  default**, so the existing sign-in flow keeps working.
- `{{ .Token }}` — 6-digit one-time code. Shown as a "backup code" in
  `magic-link`, `confirm-signup`, `recovery`, `email-change`.
- `{{ .Email }}` — the recipient address (shown in the footer).
- `{{ .NewEmail }}` — used only in `email-change.html`.

> The backup code is only usable if there's a screen that accepts it. The
> `/login` page currently only does the email-link flow — the code is there for
> when a client mangles the button, and as a hook if you later add a
> "enter code" input (ask and I'll wire it up).

## Sending / SMTP

These are just the message bodies — delivery is whatever SMTP Supabase is
pointed at (Dashboard → **Authentication → Emails → SMTP Settings**). Your
current setup already delivers to Proton, so nothing to change. If delivery
ever gets flaky, the built-in sender is throttled (~a few/hour) and the fix is
custom SMTP (Resend, Postmark, SES — all have free tiers).

## Previewing

Open `_preview.html` in a browser to see all five rendered with sample data.
It is a local preview only — not something Supabase uses.
