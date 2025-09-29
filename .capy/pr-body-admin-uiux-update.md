# Admin UI/UX — MAJ: Création utilisateur + /admin/access amélioré

Ajouts depuis la PR initiale
- /admin/users: réintégration du bloc « Créer un utilisateur » (email, mot de passe, rôle) avec toasts de succès/erreur et rechargement de la liste après création.
- /admin/access: amélioration UX majeure
  - Autocomplétion email (10 suggestions, debounce 300ms) sur la recherche utilisateur
  - Sélection d’un utilisateur puis édition inline des accès (allowedChatModes) sans modal
  - Switch « Tout autoriser » (allowedChatModes = null) + grilles de Checkbox pour modes individuels
  - Boutons « Enregistrer/Annuler », toasts de feedback, états de chargement

Notes
- Endpoints réutilisés: GET/PUT /api/admin/users/:id/chat-modes, GET /api/admin/users?q=…
- Aucun impact côté /chat ni sur les autres sections Admin.

Vérifications
- Création d’utilisateur OK → POST /api/admin/users
- Accès aux modèles: lecture/écriture OK → GET/PUT /api/admin/users/:id/chat-modes
