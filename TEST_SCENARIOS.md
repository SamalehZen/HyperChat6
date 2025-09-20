# Scénarios de test - Barre d'export globale

## Configuration requise
Les tests doivent être effectués avec des réponses contenant des tableaux HTML pour vérifier le comportement.

## ✅ Scénarios à valider

### 1. Mode Smart PDF to Excel
- **Avec tableau(x)** : La barre d'export globale doit apparaître avec les 3 boutons (CSV, XLSX, XLSX multi-onglets)
- **Sans tableau** : La barre d'export globale ne doit PAS apparaître
- **Multi-onglets** : Le bouton multi-onglets doit être activé seulement si >1 tableau ou >1 document

### 2. Mode Gemini 2.5 Flash  
- **Avec tableau(x)** : La barre d'export globale doit apparaître avec les 3 boutons
- **Sans tableau** : La barre d'export globale ne doit PAS apparaître
- **Multi-onglets** : Le bouton multi-onglets doit être activé seulement si >1 tableau ou >1 document

### 3. Mode Gemini 2.5 Pro
- **Avec tableau(x)** : La barre d'export globale ne doit PAS apparaître
- **Sans tableau** : La barre d'export globale ne doit PAS apparaître
- **Note** : Les boutons individuels par tableau doivent rester visibles

### 4. Autres modes (Claude, GPT, etc.)
- **Avec tableau(x)** : La barre d'export globale ne doit PAS apparaître
- **Sans tableau** : La barre d'export globale ne doit PAS apparaître
- **Note** : Les boutons individuels par tableau doivent rester visibles

### 5. Pages statiques (privacy, terms)
- La barre d'export globale ne doit JAMAIS apparaître sur ces pages
- Même si du contenu Markdown avec tableaux est affiché

## 🔍 Points de vérification additionnels

### Boutons individuels par tableau
- Doivent rester visibles dans TOUS les modes
- Doivent fonctionner indépendamment de la barre globale
- Présents dans le composant `TableWithExport` (non modifié)

### Logique multi-onglets
- Désactivé si 1 seul tableau ET 1 seul document (ou moins)
- Activé si >1 tableau OU >1 document
- Le tooltip doit indiquer "Plusieurs tableaux requis" si désactivé

## 📝 Exemple de tableau HTML pour les tests

```html
<table>
  <thead>
    <tr>
      <th>Produit</th>
      <th>Prix</th>
      <th>Quantité</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Article A</td>
      <td>10.00€</td>
      <td>5</td>
    </tr>
    <tr>
      <td>Article B</td>
      <td>15.50€</td>
      <td>3</td>
    </tr>
  </tbody>
</table>
```

## 🛠️ Commandes utiles pour le développement

### Vérifier le mode actuel dans la console
```javascript
// Dans la console du navigateur
const store = window.__ZUSTAND_STORE__;
console.log(store.getState().chatMode);
```

### Forcer un mode spécifique pour les tests
```javascript
// Dans la console du navigateur
window.__ZUSTAND_STORE__.setState({ chatMode: 'smart-pdf-to-excel' });
// ou
window.__ZUSTAND_STORE__.setState({ chatMode: 'gemini-2.5-flash' });
```