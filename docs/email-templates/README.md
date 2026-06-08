# CompaniesIQ — Auth email templates

Branded HTML for the Supabase Auth emails, matching the site's warm/editorial
style (paper `#FAF6EF`, accent `#D9531F`, ink `#1C1815`, Georgia serif wordmark).
Email-client safe: table layout, inline styles, no SVG/web fonts.

## How to apply

Supabase Dashboard → **Authentication → Emails** → pick the template → paste the
HTML body and set the subject. Save. (Custom SMTP via Resend should already be
configured so these send from `noreply@companiesiq.co.uk`.)

| Template | File | Subject |
|---|---|---|
| **Magic Link** | `magic-link.html` | `Your CompaniesIQ sign-in link` |
| **Confirm signup** | `confirm-signup.html` | `Confirm your email · CompaniesIQ` |
| **Reset password** | `reset-password.html` | `Reset your CompaniesIQ password` |
| **Change email address** | `change-email.html` | `Confirm your new email · CompaniesIQ` |

All use the `{{ .ConfirmationURL }}` variable (the action link Supabase injects);
`change-email.html` also uses `{{ .NewEmail }}`. The Magic Link template is what
returning users get; Confirm signup is the first-time email (because "Confirm
email" is enabled). Reset password only applies if you enable password auth
(the app is passwordless by default).
