# Guide d'intégration du nouveau composant AI_Prompt

## Conventions de rédaction
- Se référer au guide: [STYLE_GUIDE.md](./STYLE_GUIDE.md)
- Profil par défaut: équilibré; emojis discrets; titres H1/H2/H3; listes courtes.
- Microcopy UI: boutons sans emoji, verbes d’action; erreurs claires et actionnables; confirmations directes.

## 🎯 Résumé de l'intégration

Le nouveau composant `AI_Prompt` a été intégré avec succès dans votre codebase HyperChat4. Voici ce qui a été faite :

### 1. Composants créés

#### `/packages/ui/src/components/animated-ai-input.tsx`
- **Composant principal** : `AI_Prompt` - Un composant de saisie moderne et animé
- **Hook personnalisé** : `useAutoResizeTextarea` - Gère l'auto-redimensionnement du textarea
- **Icônes exportées** : `ModelIcons` - Contient toutes les icônes des modèles IA (OpenAI, Gemini, Anthropic, Meta, DeepSeek)

#### `/packages/common/components/chat-input/animated-input.tsx`
- **Composant wrapper** : `AnimatedChatInput` - Intègre AI_Prompt avec le système existant
- **Connexions préservées** :
  - ✅ Store Zustand (`useChatStore`)
  - ✅ Streaming des messages (`useAgentStream`)
  - ✅ Authentification Clerk (`useAuth`)
  - ✅ Attachement d'images (`useImageAttachment`)
  - ✅ Sauvegarde des brouillons dans localStorage
  - ✅ Gestion des threads et navigation

### 2. Modèles d'IA intégrés

#### Modèle actif :
- **Gemini Flash 2.0** ✅

#### Modèles commentés (prêts à être activés) :
- Llama 4 Scout
- GPT 4.1
- GPT 4.1 Mini
- GPT 4.1 Nano
- GPT 4o Mini
- O4 Mini
- Claude 3.5 Sonnet
- Claude 3.7 Sonnet
- DeepSeek R1

#### Modes avancés actifs :
- Recherche Approfondie (3 crédits)
- Recherche Pro (2 crédits)
- Correction (1 crédit)
- Classification Structure (1 crédit)
- Nomenclature Douanière (1 crédit) 🆕
- Smart PDF to Excel (1 crédit) 🆕

### 3. Fonctionnalités préservées

- ✅ **Sélection de modèle** : Dropdown animé avec icônes et coûts en crédits
- ✅ **Attachement d'images** : Support JPEG, PNG, GIF (max 3MB)
- ✅ **Enter pour envoyer** : Shift+Enter pour nouvelle ligne
- ✅ **Auto-redimensionnement** : Min 72px, Max 300px
- ✅ **Sauvegarde automatique** : Brouillons dans localStorage
- ✅ **Authentification** : Vérification pour les modèles qui le requièrent
- ✅ **Mode sombre** : Support complet du thème sombre
- ✅ **Animations Framer Motion** : Transitions fluides
- ✅ **Badge NEW** : Pour les nouveaux modèles
- ✅ **Badge BYOK** : Pour les modèles sans authentification requise
- ✅ **Coûts en crédits** : Affichage pour chaque modèle

### 4. Fichiers modifiés

1. `/packages/ui/src/components/index.ts` - Ajout de l'export du nouveau composant
2. `/packages/common/components/chat-input/index.ts` - Ajout de l'export AnimatedChatInput
3. `/apps/web/app/chat/layout.tsx` - Remplacement de ChatInput par AnimatedChatInput

## 🚀 Pour démarrer

### 1. Installer les dépendances (si nécessaire)

```bash
cd /project/workspace/zensamaleh/HyperChat4
bun install
```

### 2. Lancer le développement

```bash
bun run dev
```

### 3. Tester l'interface

1. Ouvrez l'application dans votre navigateur
2. Allez sur la page de chat
3. Testez les fonctionnalités suivantes :
   - Sélection de modèle (dropdown)
   - Saisie de texte avec auto-redimensionnement
   - Attachement d'images (si le modèle le supporte)
   - Envoi de message (Enter)
   - Mode sombre/clair

## 📝 Notes importantes

### Pour activer les modèles commentés :

1. Ouvrez `/packages/common/components/chat-input/animated-input.tsx`
2. Décommentez les modèles souhaités dans le tableau `AI_MODELS` (lignes 130-196)
3. Les modèles seront automatiquement disponibles dans le dropdown

### Structure du composant AI_Prompt :

```typescript
<AI_Prompt
    value={inputValue}                    // Valeur du texte
    onChange={setInputValue}               // Callback de changement
    onSend={sendMessage}                   // Callback d'envoi
    placeholder="Demandez n'importe quoi"  // Placeholder
    models={modelsWithBadges}             // Liste des modèles
    selectedModel={chatMode}              // Modèle sélectionné
    onModelChange={setChatMode}           // Callback de changement de modèle
    onAttachFile={handleFileAttachment}   // Callback d'attachement
    disabled={isGenerating}               // État désactivé
/>
```

## 🎨 Personnalisation

### Pour ajouter un nouveau modèle :

1. Ajoutez l'enum dans `/packages/shared/config/chat-mode.ts`
2. Ajoutez la configuration dans `ChatModeConfig`
3. Ajoutez le coût en crédits dans `CHAT_MODE_CREDIT_COSTS`
4. Ajoutez le modèle dans le tableau `AI_MODELS` de `animated-input.tsx`

### Pour personnaliser le style :

Le composant utilise Tailwind CSS et supporte :
- Classes utilitaires Tailwind
- Thème clair/sombre automatique
- Animations Framer Motion

## 🐛 Dépannage

### Si le dropdown ne s'affiche pas :
- Vérifiez que `@radix-ui/react-dropdown-menu` est installé
- Vérifiez les imports dans le composant

### Si les icônes ne s'affichent pas :
- Vérifiez que `lucide-react` est installé
- Vérifiez que les icônes personnalisées sont bien importées

### Si l'auto-redimensionnement ne fonctionne pas :
- Vérifiez que le hook `useAutoResizeTextarea` est bien appelé
- Vérifiez les styles CSS du textarea

## ✅ Checklist de validation

- [ ] Le composant s'affiche correctement
- [ ] Le dropdown des modèles fonctionne
- [ ] La saisie de texte est fluide
- [ ] L'auto-redimensionnement fonctionne
- [ ] L'attachement d'images fonctionne (pour les modèles qui le supportent)
- [ ] Les messages sont envoyés correctement
- [ ] Les animations sont fluides
- [ ] Le mode sombre fonctionne
- [ ] Les crédits sont affichés
- [ ] L'authentification est vérifiée

## 📧 Support

Pour toute question ou problème, référez-vous aux fichiers originaux :
- Composant original : `/packages/common/components/chat-input/input.tsx`
- Nouveau composant : `/packages/common/components/chat-input/animated-input.tsx`
- Composant UI de base : `/packages/ui/src/components/animated-ai-input.tsx`
