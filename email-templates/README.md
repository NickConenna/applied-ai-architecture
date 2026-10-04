# Branded sign-in emails (Supabase -> Authentication -> Emails)

Paste each file into the matching template, with this subject line:

| Template | Subject | File |
|---|---|---|
| Magic Link | Your CoreKit AI sign-in link | magic-link.html |
| Confirm signup | Confirm your email for CoreKit AI | confirm-signup.html |
| Invite user | Your CoreKit AI member area is ready | invite.html |

`{{ .ConfirmationURL }}` is filled in by Supabase. Leave it exactly as written.
