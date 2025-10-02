## Objet
Ajout d’un nouveau mode IA: Création d’article, aligné sur les modèles existants (correction, classification, etc.). Ce mode normalise les libellés, applique les troncatures ARKABASE, appelle la classification AA/AB/AC/AD (Gemini 2.5 Flash) avec repli, puis produit un tableau Markdown (2 lignes d’en-têtes + 1 ligne de données) dans l’ordre des colonnes.

## Changements
- Config et coûts
  - Ajoute ChatMode.CREATION_D_ARTICLE = `creation-d-article`
  - Ajoute la config: webSearch=false, imageUpload=false, retry=true, isNew=true, isAuthRequired=true
  - Coût: 2 crédits; nom affiché: « Création d’article »
  - Mappe le mode vers le modèle par défaut Gemini 2.5 Flash pour la télémétrie
- UI
  - Ajoute une tuile dans la catégorie advanced avec badge NEW et pictogramme DocumentPlusIcon
- Orchestration
  - Route le mode vers la tâche `creation-article`
  - Enregistre la tâche dans le workflow
- Tâche `creation-article`
  - Entrée: JSON { libelle_principal, code_barres_initial, numero_fournisseur_unique, numero_article }
  - Normalisation: MAJUSCULES + suppression d’accents + trim espaces multiples
  - Règles: remplit LARTAR/MDIRAR/LAREAR/LREDAR/LETIAR/LARFEF selon longueurs; CEANAR depuis code_barres_initial (<=20); NORAEF depuis numero_fournisseur_unique; NARTAR depuis numero_article; GENECB=1 si CEANAR vide
  - Classification: appelle le prompt spécialisé Gemini et extrait AA/AB/AC/AD; fallback 07/074/742/206 si échec
  - Sortie: 1 tableau Markdown (libellés longs, codes, valeurs)
- ARKABASE (intégrée)
  - Intégration complète des 155 colonnes à partir du tableau client: `HEADERS_LONG`, `HEADERS_CODES`, `REF_ROW` sont dérivés par parsing direct des 3 lignes Markdown.
  - Extension des copies de référence pour inclure PNETVA et CENTVA (valeurs « vérifiées par l’exemple »), en plus de TYREK1, TYREEF, ORAPEF, TYETAR, NBETAR, NARCVA…

## Impact
- Le mode apparaît dans les dashboards (MessageLog.mode = `creation-d-article`), crédit 2, accès authentifié.
- Compatible BYOK via le modèle Gemini 2.5 Flash existant.

## Tests manuels (exemples)
- Exemple libellé: « CAHIER DE POESIE 170X220 48P INCOLO », code-barres: « 3020120014739 », fournisseur: « 273 », article: « 136246 »
- Vérifier: troncatures sur LARTAR/MDIRAR/LAREAR/LREDAR/LETIAR/LARFEF; CEANAR tronqué à 20; GENECB=1 si CEANAR vide; AA/AB/AC/AD présents (ou fallback); champs copiés depuis REF_ROW correctement alignés

## Suivi
- Si le client met à jour le tableau ARKABASE, remplacer les 3 lignes RAW pour refléter la nouvelle version (le parsing s’ajuste automatiquement).