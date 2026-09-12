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

## Code length: do not assume 6 digits

Supabase's email codes came through as **8 digits** (e.g. `05620213`), while
Twilio Verify sends 6. The login screen hardcodes six boxes
(`Array(6).fill("")` in `AuthPage.tsx`) and truncates pasted input with
`slice(0, 6)`, so an 8-digit code is unusable: pasting silently drops the last
two digits and verification fails with no useful error.

Checked on 2026-09-12: the hosted dashboard does not appear to expose an
*email* OTP length control (the documented `SMS_OTP_LENGTH` is for SMS), and
changing Email provider settings produced a config reload with no
`OTP_LENGTH changed` entry in `auth_logs` — the code stayed 8 digits.

Fix it on our side rather than fighting the dashboard: before migrating logins
to Supabase, make the OTP UI length-agnostic instead of assuming 6. Longer
codes are stronger, so accommodating them is the right direction anyway.
