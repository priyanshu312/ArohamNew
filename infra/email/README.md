# Auth email templates

## `supabase-otp-template.html`

The branded login-code email, for **Supabase → Authentication → Emails →
Templates → Magic Link**.

- Subject: `Your Nakshra verification code`
- Body: paste the file **verbatim**

### Do not add comments to that file

Supabase renders these with Go's `text/template`, which parses the **whole**
body — HTML comments included. `<!-- ... -->` hides text from a browser, not
from the template engine.

An earlier version carried a header comment documenting the old SendGrid
placeholder, `{{{twilio_code}}}`. Those triple braces are not valid Go template
syntax, so every send failed with:

```
templatemailer: template type "magic_link":
  .../templates/magic-link:8: unexpected "{" in command
```

The give-away is that the API still answers **HTTP 200** — the request is
accepted and the mail is only built afterwards, so a broken template looks
exactly like success from the caller's side. It shows up only in
`auth_logs`. If a template change ever seems to "send" but nothing arrives,
read those logs before suspecting SendGrid.

Keep the file as pure markup plus the single `{{ .Token }}` placeholder. Notes
belong here instead.

### Placeholders

| Placeholder | Sends |
|---|---|
| `{{ .Token }}` | a 6-digit code ← what we want |
| `{{ .ConfirmationURL }}` | a magic sign-in link |

Supabase decides code-vs-link purely from what the template contains; there is
no separate setting.

### Structure

Table-based layout with inline styles on every element, which looks dated but is
deliberate: Outlook renders mail through Word's engine and breaks modern CSS
layout, and Gmail strips `<style>` blocks. Keep both properties when editing.

Lora and Nunito Sans can't be reliably web-loaded in email, so it falls back to
Georgia and the system sans — close to the site, not identical.

### Status

Not live. Login codes still go through Twilio Verify → SendGrid's own dynamic
template (`d-35981befa66d4e46a7042b4c5ffd1634`). This file only takes over if
and when logins move to Supabase Auth.

## Code length: do not assume 6 digits — FIXED 2026-09-12

Supabase's email codes arrive as **8 digits** (e.g. `05620213`); Twilio Verify
sends 6. The login screen used to hardcode six boxes everywhere
(`Array(6).fill("")`, `slice(0, 6)` on paste, `i === 5` for the last box), so an
8-digit code was unusable: pasting kept the first six digits, silently dropped
the rest, and verification then failed with no useful error.

No dashboard setting was found that changes the *email* code length — the
documented `SMS_OTP_LENGTH` governs SMS, and changing Email provider settings
produced a config reload with no `OTP_LENGTH changed` entry in `auth_logs`.

So it is fixed on our side instead. `OtpBoxes` renders one box per entry in the
array it is handed and derives every bound from that length; `AuthPage` owns the
length through a single `OTP_LENGTH` constant, overridable per environment with
`VITE_OTP_LENGTH` (4-10, default 6). The on-screen copy follows it too. Verified
in the browser at both 6 and 8 for paste, typing and backspace.

An 8-digit Supabase code is therefore no longer a blocker for the migration.
