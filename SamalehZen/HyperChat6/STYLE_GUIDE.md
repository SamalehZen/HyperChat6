<a id="style"></a>
# Style d’écriture — HyperChat6

Sommaire
- [1) Style d’écriture — HyperChat6](#style)
- [2) Contexte & objectifs](#contexte-objectifs)
- [3) Profil par défaut (à respecter sauf mention contraire)](#profil)
- [4) Palette de saturation de style (définitions + quand l’utiliser)](#palette)
- [5) Structure recommandée (avec un template Markdown copiable)](#structure)
- [6) Microcopy UI (boutons, erreurs, confirmations)](#microcopy)
- [7) Emojis — règles d’usage](#emojis)
- [8) Longueur & concision](#longueur)
- [9) Ton & voix](#ton)
- [10) Exemples d’adaptation (même sujet, 3 rendus)](#exemples)
- [11) Check‑list avant de publier](#checklist)
- [12) Portée & exceptions](#portee)
- [13) Versioning & ownership](#versioning)

<a id="contexte-objectifs"></a>
## 2) Contexte & objectifs
- Pourquoi: clarté, cohérence, lisibilité à l’échelle du monorepo.
- Où s’applique: documentation (README, guides), issues, descriptions de PR, changelogs, posts d’annonce; microcopy UI.
- Bénéfices: accélère les revues, facilite la contribution, harmonise la voix de marque.

<a id="profil"></a>
## 3) Profil par défaut (à respecter sauf mention contraire)
- Style: Équilibré / semi‑créatif
- Ton: Professionnel
- Emojis: Quelques bien placés (discrets, pertinents)
- Structure: H1 + H2/H3 + listes
- Longueur: Ultra‑concis (bullet points)
- Langue: Français (100%)
- Passage en style expressif: uniquement pour blog/annonces

<a id="palette"></a>
## 4) Palette de saturation de style (définitions + quand l’utiliser)
- Neutre / sobre: sans emoji, purement technique — pour code, API, specs, RFC, changelogs critiques.
- Équilibré / semi‑créatif: quelques emojis, sous‑titres, listes — par défaut pour README, guides, PR/Issues.
- Expressif / riche: plus d’emphase et d’emojis — seulement pour blog/annonces, pages marketing légères.

Exemples
- Neutre / sobre
  - "GET /v1/messages — renvoie 200 avec { items: Message[] }." 
  - "Paramètre requis: userId (string). Réponse en ≤ 300 ms en P95."
  - "Changelog: corrige une régression sur l’analyse YAML."
- Équilibré / semi‑créatif
  - "Amélioration de la latence P95 (−18%) 🚀 — aucune modification d’API."
  - "Guide d’intégration: 3 étapes, <5 minutes ⏱️."
  - "Ajout d’un mode Lecture seule pour limiter les erreurs 🛡️."
- Expressif / riche
  - "Nouvelle version disponible ✨: interface plus fluide, démarrage 2× plus rapide."
  - "Annonce: prise en charge des exports CSV en un clic 📦."
  - "Cap sur la qualité: correctifs et retours utilisateurs intégrés 💬."

<a id="structure"></a>
## 5) Structure recommandée (avec un template Markdown copiable)
Principes
- Titres clairs et hiérarchisés
- Paragraphes courts (2–3 phrases max)
- Listes pour synthèse et critères

Gabarit Markdown
```md
# [Titre H1]

## Objectif
- [But en 1‑2 puces]

## Contexte
- [Contexte bref]

## Étapes / Détails
### [Sous‑partie]
- [Liste]

## Résultat attendu
- [Critères clairs]

## Références
- [Liens]
```

Exemples de structure
- README
  - Bien: "# HyperChat6 — démarrage rapide", "## Installation", "## Utilisation", listes (3–5 puces), liens utiles.
  - À éviter: bloc de texte long sans titres; sections redondantes; captures sans description.
- Guide pas à pas
  - Bien: "## Pré‑requis", "## Étapes (1–3)", "## Validation" avec critères.
  - À éviter: étapes floues; absence de critères de réussite; jargon non expliqué.
- Description de PR
  - Bien: sections "Objectif", "Changements", "Impact", "Tests" en puces courtes.
  - À éviter: titre vague; roman; absence de liens vers issues.

<a id="microcopy"></a>
## 6) Microcopy UI (boutons, erreurs, confirmations)
Règles générales
- Français uniquement; casse phrase; concision; pas d’emoji.
- 1 idée par message; indiquer l’action ou l’effet attendu.

Boutons
- Règles: verbe d’action explicite; 1–3 mots; pas d’emoji; éviter la ponctuation.
- Bien (avec contexte)
  - Contexte: envoi d’un formulaire — "Envoyer"
  - Contexte: sauvegarde d’un profil — "Enregistrer"
  - Contexte: modal de suppression — "Supprimer"
  - Contexte: import de fichier — "Importer"
- À éviter
  - "OK", "Valider", "Continuer…" (vague)
  - "ENVOYER LE FORMULAIRE" (trop long/majuscule)
  - "🚀 Envoyer" (emoji)

Erreurs
- Règles: claires, neutres, actionnables; proposer une solution; format court.
- Bien (message + action)
  - "Impossible d’enregistrer. Vérifiez votre connexion et réessayez."
  - "Format de fichier non pris en charge. Importez un .csv ou .xlsx."
  - "Session expirée. Connectez‑vous à nouveau."
  - "Accès refusé. Demandez à un administrateur d’ajouter votre rôle."
- À éviter
  - "Erreur inconnue" (inutile)
  - "Échec" (non actionnable)
  - "Oops!" (informel)
  - Messages techniques bruts (stack trace) exposés à l’utilisateur

Confirmations
- Règles: positives, directes, indiquer l’effet; distinguer destructif vs non destructif.
- Non destructif — Bien
  - "Profil mis à jour. Les changements sont visibles immédiatement."
  - "Mot de passe modifié. Vous pouvez vous reconnecter."
  - "Fichier importé. 23 lignes ajoutées."
- Destructif — Bien
  - "Supprimer définitivement ce projet ? Cette action est irréversible."
  - Boutons: "Supprimer" / "Annuler"
  - "Conversation archivée. Vous pourrez la restaurer plus tard."
- À éviter (tous cas)
  - "Êtes‑vous sûr ?" sans contexte
  - "Action réussie 🎉" (emoji)
  - "Supprimé !!!" (ponctuation excessive)

<a id="emojis"></a>
## 7) Emojis — règles d’usage
Règles
- Pertinence > quantité; préférer 0 que trop.
- Jamais dans le code; éviter dans les titres H1/H2 techniques.
- Privilégier des emojis clairs (validation, information) plutôt que décoratifs.

Exemples
- Bien
  - "Amélioration des performances (+12%)" ✅
  - "Migration terminée — aucun downtime observé" 🟢
  - "Ajout d’une section “Dépannage”" ℹ️
  - "Disponibilité régionale étendue" 🌍
- À éviter
  - "🎉🎉🎉 Fix du bug critique" (excessif, ambigu)
  - "Init 🧪" (peu informatif)
  - Emoji dans un titre technique: "## Déploiement 🚀" (éviter)
  - "Patch ???" (ponctuation floue + pas d’info)

<a id="longueur"></a>
## 8) Longueur & concision
- Favoriser les bullets; 3–5 puces max par bloc.
- 1 idée par phrase; supprimer les redondances.
- Préférer des critères vérifiables (chiffres, statuts, liens).

<a id="ton"></a>
## 9) Ton & voix
- Professionnel, direct, pédagogique.
- Expliquer les acronymes au premier passage; éviter le jargon non explicité.
- Préférer l’impératif pour les actions ("Exécuter", "Vérifier").

<a id="exemples"></a>
## 10) Exemples d’adaptation (même sujet, 3 rendus)
Sujet: "CSS line-height"

- Neutre / sobre (sans emoji, 2–3 phrases)
  - La propriété CSS line-height contrôle l’espace vertical entre les lignes de texte. Une valeur comprise entre 1,4 et 1,6 améliore généralement la lisibilité des paragraphes. Éviter les valeurs absolues si le contenu doit rester adaptatif.

- Équilibré (quelques emojis, H2 + puces)
  
  ### Pourquoi c’est utile
  - Meilleure lisibilité entre 1,4–1,6 📚
  - Éviter les unités fixes; préférer des valeurs sans unité ↔️
  - Adapter le line-height aux tailles de police et au contexte (titres vs corps)

  ### Rappel rapide
  - Par défaut: utiliser des valeurs sans unité
  - Tester sur mobile et ordinateur
  - Vérifier le contraste et la hauteur de ligne sur fonds variés

- Expressif (plus vivant, pour annonces)
  - Nouveau guide typographique disponible ✨: optimisez votre line-height pour une lecture plus fluide. Conseils pratiques, exemples avant/après et réglages recommandés (1,4–1,6) 📏. Idéal pour harmoniser titres et paragraphes sans perdre en densité.

<a id="checklist"></a>
## 11) Check‑list avant de publier
- Titres présents et hiérarchisés
- Bullets concises (3–5 max par bloc)
- Emojis pertinents et discrets (si utilisés)
- Liens utiles vers sources/références
- Critères vérifiables (tests, chiffres, captures)
- Microcopy UI vérifiée (boutons/erreurs/confirmations conformes)

<a id="portee"></a>
## 12) Portée & exceptions
- Passer en "Neutre / sobre" pour: docs API, RFC techniques, specs, messages d’erreur techniques.
- Autoriser "Expressif / riche" uniquement pour: posts d’annonce, changelogs marketing, pages de lancement.
- Les messages d’interface (microcopy) doivent rester brefs et neutres; utiliser l’équilibré uniquement pour un onboarding doux.

<a id="versioning"></a>
## 13) Versioning & ownership
- Owner: Zen Aekaaa
- Proposer des évolutions: ouvrir une PR courte avec un résumé (3–5 puces) et au moins un exemple avant/après. Mentionner l’impact (docs, issues, PR, changelog). Associer la PR à STYLE_GUIDE.md dans la description.
