## Style d’écriture

Consultez le guide de style: [STYLE_GUIDE.md](./STYLE_GUIDE.md).

S’applique aux documents, issues, descriptions de PR, changelogs et annonces.

---

## Authentification locale (remplacement de Clerk)

Clerk a été supprimé et remplacé par une authentification locale basée sur Prisma + cookies httpOnly.

- Inscription publique désactivée: seuls les admins créent les comptes.
- Premier admin: POST /api/auth/setup lit ADMIN_EMAIL et ADMIN_PASSWORD (idempotent).
- Sessions: cookie `session` httpOnly, SameSite=Lax, Secure en prod, expiration 30 jours.
- Géolocalisation: uniquement via les en‑têtes Vercel (Geo) — aucune requête externe.
- Historique d’activité conservé 90 jours (script de purge fourni).

### Variables d’environnement

- DATABASE_URL
- ADMIN_EMAIL
- ADMIN_PASSWORD
- SESSION_SECRET (optionnel pour signature future)
- FREE_CREDITS_LIMIT_REQUESTS_AUTH, FREE_CREDITS_LIMIT_REQUESTS_IP

Voir `.env.example` pour un exemple.

### Endpoints

- POST `/api/auth/login` { email, password } → crée la session et place le cookie
- POST `/api/auth/logout` → invalide la session
- GET `/api/auth/me` → { user: { id, email, role, isSuspended } }
- POST `/api/auth/heartbeat` → 204; met à jour la présence (lastSeen, IP, Geo)
- POST `/api/auth/setup` → bootstrap du premier admin (403 si déjà initialisé)

Admin (protégé):
- GET `/api/admin/users` (pagination, filtres q/status)
- POST `/api/admin/users` { email, password, role? }
- PATCH `/api/admin/users/[id]` { action: 'reset_password'|'suspend'|'unsuspend'|'update_role', ... }
- DELETE `/api/admin/users/[id]`
- GET `/api/admin/users/[id]/activity`
- GET `/api/admin/online`

### UI

- Page `/admin`: gestion complète des comptes + panneau "Utilisateurs en ligne" en temps réel.
- Page `/sign-in`: formulaire email/mot de passe.
- Contexte client: `packages/common/context/auth.tsx` expose `useAuth()` et `useUser()`.
- Un heartbeat client envoie `/api/auth/heartbeat` toutes les 60s.

### Migration depuis Clerk

- Suppression immédiate de Clerk (middleware, provider, hooks, imports).
- Routes existantes (completion, messages/remaining) basculées sur la session locale.
- Feedback et composants mis à jour pour utiliser le nouveau contexte.

### Purge des logs d’activité

Script CLI:

```
cd apps/web && bun tsx scripts/purge-activity-logs.ts
```

Supprime les entrées de `ActivityLog` de plus de 90 jours.
