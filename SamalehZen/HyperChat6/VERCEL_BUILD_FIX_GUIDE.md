# 🚀 Guide de Correction Build Vercel - HyperChat4

## 📋 Résumé des Problèmes Critiques

1. **🔴 TypeScript/JSX** : Configuration JSX manquante dans packages/common
2. **🔴 Imports manquants** : Composants UI non exportés correctement  
3. **🔴 import.meta** : Incompatible avec Next.js
4. **⚠️ Browserslist** : Configuration absente
5. **⚠️ Variables d'env** : Gestion incohérente
6. **⚠️ Prisma/Drizzle** : Conflit potentiel de configuration

---

## 1. 🔧 Turbo & Workspaces

### ✅ État actuel
- Turbo configuré avec yarn@1.22.22
- Tasks build/lint/dev correctement définis

### 🔴 Problème : Lockfile potentiellement manquant pour Bun
```json
// turbo.json actuel utilise yarn
"packageManager": "yarn@1.22.22"
```

### ✅ Solution
```bash
# Option A : Rester sur Yarn
yarn install
git add yarn.lock
git commit -m "fix: add yarn.lock for Turbo workspace resolution"

# Option B : Migrer vers Bun (recommandé)
# Dans package.json racine, remplacer:
"packageManager": "bun@1.0.0"
# Puis:
bun install
git add bun.lockb
```

### 📝 Configuration améliorée pour turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": [
    "NODE_ENV",
    "DATABASE_URL",
    "NEXT_PUBLIC_*",
    "CLERK_SECRET_KEY",
    "SENTRY_*",
    "KV_REST_API_*",
    "UPSTASH_*",
    "FREE_CREDITS_*",
    "GEMINI_API_KEY",
    "SERPER_API_KEY",
    "JINA_API_KEY"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
      "env": ["DATABASE_URL", "SENTRY_AUTH_TOKEN"]
    }
  }
}
```

---

## 2. 🔧 TypeScript / Next.js

### 🔴 Problème : JSX non configuré dans packages/common
```
Cannot use JSX unless the '--jsx' flag is provided (TS17004)
```

### ✅ Solution 1 : Corriger tsconfig.json
```json
// packages/common/tsconfig.json
{
  "extends": "@repo/typescript-config/react-library.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

### 🔴 Problème : useAuth() ne retourne pas user
```typescript
// Erreur: Property 'user' does not exist on UseAuthReturn
const { user } = useAuth();
```

### ✅ Solution 2 : Adapter le code
```typescript
// packages/common/components/chat-input/animated-input.tsx
// Remplacer ligne 33:
const { isSignedIn } = useAuth(); // user n'est pas dans le type de retour

// Si besoin de user, utiliser useUser():
import { useAuth, useUser } from '@clerk/nextjs';
const { isSignedIn } = useAuth();
const { user } = useUser();
```

### 🔴 Problème : import.meta non supporté
```typescript
// packages/ai/worker/use-workflow-worker.ts
new Worker(new URL('./worker.ts', import.meta.url))
```

### ✅ Solution 3 : Remplacer import.meta
```typescript
// Option A : Utiliser le webpack worker-loader
// packages/ai/worker/use-workflow-worker.ts
const worker = new Worker(
  new URL('./worker.ts', typeof window !== 'undefined' ? window.location.href : ''),
  { type: 'module' }
);

// Option B : Dynamic import pour Next.js
const createWorker = async () => {
  if (typeof window !== 'undefined') {
    const WorkerModule = await import('./worker.ts?worker');
    return new WorkerModule.default();
  }
  return null;
};
```

---

## 3. 🔧 TailwindCSS

### ✅ État actuel
- Pas d'inclusion de node_modules dans content
- Configuration correcte des chemins

### ⚠️ Amélioration recommandée
```javascript
// apps/web/tailwind.config.ts
export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    // Être plus spécifique pour éviter les scans inutiles
    '../../packages/ui/src/components/**/*.{ts,tsx}',
    '../../packages/common/components/**/*.{ts,tsx}',
    // Exclure explicitement certains patterns
    '!../../packages/**/node_modules/**',
    '!../../packages/**/*.test.{ts,tsx}',
    '!../../packages/**/*.stories.{ts,tsx}'
  ],
  // Ajouter safelist pour les classes dynamiques
  safelist: [
    'duration-[1000ms]',
    'duration-[500ms]',
    // Autres classes dynamiques utilisées
  ]
}
```

### 🔴 Problème : Classes ambiguës avec caractères spéciaux
```html
<!-- Problème -->
<div class="duration-[1000ms]">

<!-- Solution -->
<div class="duration-&lsqb;1000ms&rsqb;">
```

---

## 4. 🔧 Sentry

### ⚠️ Amélioration : Utiliser variable d'environnement
```typescript
// apps/web/sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
  
  // Réduire le sample rate en production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay seulement pour les erreurs
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
});
```

### 📝 Configuration next.config.mjs
```javascript
// apps/web/next.config.mjs
const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};
```

---

## 5. 🔧 Browserslist

### 🔴 Problème : Aucune configuration trouvée

### ✅ Solution : Créer .browserslistrc
```bash
# Créer .browserslistrc à la racine
cat > .browserslistrc << 'EOF'
# Browsers we support
defaults
not IE 11
not dead
> 0.2%
last 2 versions
EOF
```

### 📝 Ou dans package.json
```json
{
  "browserslist": [
    "defaults",
    "not IE 11",
    "not dead",
    "> 0.2%",
    "last 2 versions"
  ]
}
```

### 🔧 Mettre à jour caniuse-lite
```bash
npx update-browserslist-db@latest
```

---

## 6. 🔧 Prisma

### ✅ Configuration correcte, mais attention au conflit avec Drizzle

### 📝 Build script amélioré
```json
// apps/web/package.json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

### 🔴 Problème potentiel : Drizzle vs Prisma
```typescript
// apps/web/drizzle.config.ts référence un schema qui peut ne pas exister
// Si vous utilisez Prisma, supprimez ou commentez drizzle.config.ts
```

---

## 7. 🔧 Variables d'Environnement

### ✅ Créer .env.example
```bash
# .env.example
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# KV Store (Upstash Redis)
KV_REST_API_URL=
KV_REST_API_TOKEN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# AI Services
GEMINI_API_KEY=
SERPER_API_KEY=
JINA_API_KEY=

# Sentry
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=

# Credits System
FREE_CREDITS_LIMIT_REQUESTS_AUTH=100
FREE_CREDITS_LIMIT_REQUESTS_IP=10

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_POSTHOG_KEY=
```

### 📝 Configuration Vercel
```bash
# Ajouter dans Vercel Dashboard > Settings > Environment Variables
# Toutes les variables ci-dessus avec les vraies valeurs
```

---

## 8. 📦 Commandes de Correction Complètes

```bash
# 1. Installer les dépendances
bun install

# 2. Mettre à jour browserslist
npx update-browserslist-db@latest

# 3. Générer Prisma Client
cd packages/prisma && bun prisma generate

# 4. Nettoyer les caches
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# 5. Vérifier les types
bun run type-check

# 6. Build local de test
bun run build

# 7. Commit des corrections
git add -A
git commit -m "fix: resolve build issues for Vercel deployment

- Fix TypeScript JSX configuration in packages
- Replace import.meta with Next.js compatible code  
- Add browserslist configuration
- Configure environment variables properly
- Update Sentry configuration
- Fix component exports"

# 8. Push vers la branche
git push origin scout/sco-1-b746a647
```

---

## ✅ Checklist Finale

- [ ] TypeScript JSX configuré dans tous les packages
- [ ] import.meta remplacé par des alternatives compatibles
- [ ] Browserslist configuré
- [ ] Variables d'environnement documentées dans .env.example
- [ ] Sentry utilise des variables d'environnement
- [ ] Turbo.json inclut toutes les variables globales
- [ ] Prisma generate dans le script de build
- [ ] Lockfile présent (yarn.lock ou bun.lockb)
- [ ] Build local réussi avec `bun run build`
- [ ] Toutes les variables configurées dans Vercel

---

## 🚀 Déploiement Vercel

Après avoir appliqué toutes les corrections :

1. **Push les changements**
   ```bash
   git push origin scout/sco-1-b746a647
   ```

2. **Dans Vercel Dashboard**
   - Vérifier que toutes les variables d'environnement sont configurées
   - Relancer le build
   - Surveiller les logs pour tout warning restant

3. **Si le build échoue encore**
   - Vérifier les logs spécifiques de l'erreur
   - Utiliser `vercel build` localement pour debug
   - Vérifier la version de Node.js (>= 18.17)

---

## 📞 Support

Si des erreurs persistent après ces corrections, vérifiez :
- La version de Node.js sur Vercel (Settings > General > Node.js Version)
- Les logs détaillés dans Vercel Dashboard
- La compatibilité des dépendances avec l'environnement Vercel

Ce guide devrait résoudre tous les problèmes de build identifiés. Appliquez les corrections dans l'ordre pour un résultat optimal.