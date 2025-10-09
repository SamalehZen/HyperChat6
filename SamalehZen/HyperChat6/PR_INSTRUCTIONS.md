# Instructions pour créer la Pull Request

## Rédaction des PR
- Suivre le guide de style: [STYLE_GUIDE.md](./STYLE_GUIDE.md) — ton, structure, emojis, concision, microcopy.
- Utiliser le profil par défaut (équilibré) et le gabarit proposé.
- Limiter la description à des puces vérifiables (3–5) et ajouter des liens/références.

Comme les credentials GitHub ne sont pas configurés dans cette session, voici les commandes à exécuter manuellement pour créer la pull request :

## 📝 Étapes à suivre

### 1. Ouvrir un terminal dans le projet
```bash
cd /project/workspace/zensamaleh/HyperChat4
```

### 2. Vérifier le statut des modifications
```bash
git status
```

### 3. Ajouter tous les fichiers modifiés
```bash
git add -A
```

### 4. Créer le commit
```bash
git commit -m "feat: Integrate new AI_Prompt component with animated input

BREAKING CHANGE: Replaced ChatInput with AnimatedChatInput component

- Added AI_Prompt component with auto-resize and animations
- Created AnimatedChatInput wrapper for seamless integration
- Preserved all existing functionality (auth, streaming, attachments)
- Integrated all AI models with icons and credit costs
- Added support for new modes (Nomenclature Douanière, Smart PDF to Excel)
- Improved UX with animated model selection dropdown

Scout jam: b746a647"
```

### 5. Pousser vers la branche de travail
```bash
git push origin scout/sco-1-b746a647
```

### 6. Créer la Pull Request via GitHub CLI
```bash
gh pr create \
  --title "feat: Integrate new AI_Prompt component with enhanced UX" \
  --base main \
  --head scout/sco-1-b746a647 \
  --body "Voir le fichier create-pr.sh pour la description complète"
```

### OU

### 6. Créer la Pull Request via l'interface GitHub

1. Aller sur https://github.com/zensamaleh/HyperChat4
2. Cliquer sur "Pull requests"
3. Cliquer sur "New pull request"
4. Sélectionner :
   - base: `main`
   - compare: `scout/sco-1-b746a647`
5. Utiliser le titre et la description fournis dans le fichier `create-pr.sh`

## 📋 Résumé des changements pour la PR

### Fichiers créés :
- `packages/ui/src/components/animated-ai-input.tsx`
- `packages/common/components/chat-input/animated-input.tsx`
- `INTEGRATION_GUIDE.md`
- `create-pr.sh`

### Fichiers modifiés :
- `packages/ui/src/components/index.ts`
- `packages/common/components/chat-input/index.ts`
- `apps/web/app/chat/layout.tsx`

### Fonctionnalités ajoutées :
- ✅ Nouveau composant AI_Prompt avec animations
- ✅ Auto-redimensionnement du textarea
- ✅ Dropdown animé pour la sélection de modèle
- ✅ Icônes pour tous les modèles d'IA
- ✅ Affichage des coûts en crédits
- ✅ Support complet du mode sombre
- ✅ Badges NEW et BYOK

### Fonctionnalités préservées :
- ✅ Toutes les connexions existantes (stores, hooks, auth)
- ✅ Streaming des messages
- ✅ Attachement d'images
- ✅ Gestion des threads
- ✅ Sauvegarde automatique des brouillons

## 🔍 Points de vérification avant merge

1. Tester le composant en local avec `bun run dev`
2. Vérifier que tous les modèles s'affichent correctement
3. Tester l'attachement d'images
4. Vérifier le mode sombre
5. Tester l'envoi de messages
6. Vérifier la sauvegarde des brouillons