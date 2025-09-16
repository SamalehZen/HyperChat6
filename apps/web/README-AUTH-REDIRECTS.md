Auth Redirects — Clerk + OAuth

Overview
This app uses Clerk (@clerk/nextjs v6) with a custom sign‑in page at /sign-in and dedicated SSO callback pages at:
- /sign-in/sso-callback
- /sign-up/sso-callback

During OAuth (Google, GitHub, Apple), the flow will briefly visit Clerk’s hosted domain (accounts.dev). The final redirect should land users on /chat in production at https://hypergeant.vercel.app.

Clerk Dashboard Settings (Admin)
Please apply these settings in the Clerk project used by production:

1) Allowed origins
- https://hypergeant.vercel.app

2) Allowed redirect URLs
- https://hypergeant.vercel.app/sign-in/sso-callback
- https://hypergeant.vercel.app/sign-up/sso-callback

Notes
- HTTPS is recommended. Add http variants only if you explicitly test locally without a tunnel.
- Do NOT enable the Clerk proxy. The team prefers accounts.dev to remain visible during the handshake.

Environment variables in Vercel (Production)
Set these variables in the Vercel project settings for the production environment:
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
- CLERK_SECRET_KEY=sk_live_...
- NEXT_PUBLIC_APP_URL=https://hypergeant.vercel.app
- NEXT_PUBLIC_AFTER_SIGN_IN_URL=/chat

If you cannot obtain access to the current Clerk project, create a new Clerk project in an account you control and replace the Publishable/Secret keys in Vercel accordingly.

What to expect after deploying
- Clicking “Continuer avec Google” (or GitHub/Apple) may briefly go to accounts.dev for OAuth, then will return to https://hypergeant.vercel.app/chat.
- Refreshing the page after sign‑in keeps the user authenticated on /chat, thanks to Clerk session cookies and afterSignInUrl configuration.
