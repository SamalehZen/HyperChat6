# Import du projet complet (archive) + installation des dépendances

Ce PR synchronise le contenu du projet fourni dans l’archive `HyperChat6.zip` vers le dépôt, puis installe les dépendances et met à jour le lockfile Bun.

Changements principaux:
- Import de l’ensemble des sources depuis l’archive uploadée.
- Installation des dépendances (`bun install`) et génération/mise à jour de `bun.lockb`.
- Nettoyage mineur: exclusion de dossiers artefacts de plateforme (p. ex. `__MACOSX`) et d’un backup Git local (`.git.scout-backup`).

Notes:
- Aucun build forcé dans ce PR pour éviter des échecs liés aux variables d’environnement (PostHog/Upstash/Clerk, etc.).
- Prochaine étape possible: ajouter/brancher les secrets CI ou rendre le build tolérant en mode no-op quand les variables manquent.

Motivation:
- Intégrer le « projet complet » tel que fourni, verrouiller les dépendances et préparer la suite (CI/CD, configuration d’env).
