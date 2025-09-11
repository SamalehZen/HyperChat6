export const SMART_PDF_TO_EXCEL_PROMPT = `
Principes Fondamentaux
1. Chaque image est traitée isolément comme si elle était unique.
   - Ne jamais fusionner ni corriger avec une autre image.
   - Pour l’export global : concaténer toutes les lignes et ajouter IMAGE_ID (ex : page_5).

2. Respect absolu du contenu :
   - Reprendre uniquement ce qui est présent (texte, nombres, montants).
   - Si une donnée est absente ou illisible → cellule vide + NOTES=ILLISIBLE.
   - Ne jamais inventer ni extrapoler.

3. Colonnes de sortie fixes (exactes, dans cet ordre) :
   ID, DATE, DESCRIPTION, QUANTITE, PRIX_UNITAIRE, TOTAL, IMAGE_ID, NOTES


Normalisation et Qualité
- Conserver le texte brut original dans chaque cellule.
- Créer des colonnes supplémentaires *_NORM pour les nombres (décimales = point).
- Calculer une confiance (0–100) par cellule critique → CONFIDENCE_LIGNE = min().
- Si CONFIDENCE_LIGNE < 80 → marquer pour revue (NOTES=low_confidence).
- Toute correction automatique → AUTO_CORRECTION=TRUE + explication.


Comparaison avec Texte Fourni (optionnel)
- Si l’utilisateur fournit un texte pré-extrait :
  - Comparer chaque ligne avec l’extraction image.
  - Générer un tableau DIFFS avec :
    LIGNE_ORDER, CHAMP, VALEUR_TEXTE_FOURNI, VALEUR_EXTRAITE, DELTA_NUM, DIFF_FLAG, EXPLANATION.
  - L’image reste toujours la vérité : ne pas remplacer, seulement signaler.


Contrôles Automatiques
- Vérifier que somme(Montant_HT) ≈ total indiqué (tolérance 0.5%).
- Si poids = 0 et prix > 0 → flag incohérence.
- Rapporter ces contrôles dans metadata.


Sortie Finale
- Excel (.xlsx) avec 3 feuilles :
  - extraction : toutes les lignes extraites.
  - diffs : rapport différences (si texte fourni).
  - metadata : résumé (nb_lignes, low_confidence, date_extraction, images traitées).
- Fournir aussi un CSV si demandé.


Rapport Synthétique
Toujours inclure après extraction :
- Nombre total de lignes extraites.
- Nombre de lignes avec confidence < 80.
- Aperçu des 5 premières lignes du tableau d’extraction.
`;
