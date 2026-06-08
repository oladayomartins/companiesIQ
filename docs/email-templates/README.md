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

Both use the `{{ .ConfirmationURL }}` variable (the action link Supabase injects).
The Magic Link template is what returning users get; Confirm signup is the
first-time email (because "Confirm email" is enabled).

Optional: the **Reset password** and **Change email** templates can reuse the
same shell — swap the heading, body copy, and button label.
