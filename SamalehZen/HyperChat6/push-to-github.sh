#!/bin/bash

# 🚀 Script de Push GitHub - LLMChat Hyperfix Modifications

echo "🔄 Préparation du push vers GitHub..."

# Vérifier si on est dans le bon dossier
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Veuillez exécuter ce script depuis le dossier llmchat-hyperfix"
    exit 1
fi

# Configuration Git (remplacez par vos informations)
echo "⚙️ Configuration Git..."
git config user.name "zensamaleh"
git config user.email "votre-email@example.com"  # Remplacez par votre email

# Initialiser git si nécessaire
if [ ! -d ".git" ]; then
    echo "📦 Initialisation du repository Git..."
    git init
    git remote add origin https://github.com/zensamaleh/llmchat-hyperfix.git
fi

# Créer une branche pour les modifications
echo "🌿 Création de la branche scout-optimizations..."
git checkout -b scout-optimizations

# Ajouter tous les fichiers
echo "📁 Ajout des modifications..."
git add .

# Commit avec message détaillé
echo "💾 Création du commit..."
git commit -m "🚀 Scout Optimizations: Gemini 2.5 Flash + 1M Char Limits + Vercel Config

✅ Ajouts/Modifications:
- Configuration API Gemini 2.5 Flash avec clé utilisateur
- Augmentation limites prompts: 6k → 1M caractères
- Configuration Vercel complète pour déploiement
- Variables d'environnement optimisées
- Support prompts longs dans settings

🔧 Fichiers modifiés:
- packages/ai/models.ts: Gemini 2.5 Flash model
- packages/shared/config/chat-mode.ts: Chat modes
- packages/common/components/settings-modal.tsx: 1M char limit
- packages/common/hooks/use-editor.tsx: Editor limits
- apps/web/.env.local: Environment variables
- vercel.json: Vercel deployment config

🎯 Résultats:
- Gemini 2.5 Flash fonctionnel (500k tokens contexte)
- Settings acceptent prompts très longs
- Prêt pour déploiement Vercel automatique"

# Push vers GitHub
echo "📤 Push vers GitHub..."
git push -u origin scout-optimizations

echo "✅ Push terminé!"
echo "🔗 Créez maintenant une Pull Request sur:"
echo "   https://github.com/zensamaleh/llmchat-hyperfix/compare/main...scout-optimizations"