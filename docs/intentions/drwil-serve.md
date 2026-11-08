# Intention : `drwil serve`, une vue du projet en direct, pour tout adoptant

**Statut** : cadrée le 2026-11-08 — fiche de chantier : `docs/projects/drwil-serve.md`. Rassemble les notes des
2026-11-07 et 2026-11-08 et la fiche du 2026-10-27 (branche `cadrage/tableau-de-bord-serveur-leger`, PR #267 fermée
sans fusion).

## Besoin

Tel qu'exprimé par le demandeur :

- 2026-10-27 : un petit tableau de bord en serveur local léger, embarquable avec le paquet, pour suivre les chantiers
  selon tous leurs aspects (état, cadrage, preuves, coût, intentions et décisions en attente). Il reprend ce que font les
  artifacts Claude (tri des intentions, mesures de la CI) et remplace le tableau de bord statique.
- 2026-11-07 : équiper le paquet du mini serveur `drwil-vue` (board, contrats, détails, événements, usage) par
  `drwil serve [--host] [--port]` : 127.0.0.1 par défaut, 0.0.0.0 seulement en option explicite, dépôt courant, aucune
  donnée nominative ni secret. Version 1 en lecture seule avec rafraîchissement en direct. Ensuite, sondages cliquables
  derrière un jeton ; attestation et verdict de recette restent au terminal. Accès distant par réseau privé, jeton
  obligatoire hors 127.0.0.1, actions en liste fermée, journal des actions, couche OIDC optionnelle
  (`--oidc-issuer`, compatible Keycloak) sans embarquer de fournisseur. Chat web intégré : intention distincte, plus tard.
- 2026-11-08 : proposer `drwil-vue` de façon générique à un adoptant. Le lancer depuis le chat ; au démarrage d'une
  session, le démarrer s'il ne tourne pas déjà, avec un message d'accueil dans le chat qui dit où aller ou donne le
  lien. Interface mobile first. GitLab dès le début.

## Existant

Relevé le 2026-11-08 :

- Prototype `~/outils/drwil-vue`, hors dépôt, non versionné, sans test : environ 1 500 lignes sans dépendance
  (six modules Node et une page HTML). Lecture seule, événements relevés toutes les 5 s. Propre au dépôt drwil : voir la section 1 de la fiche.
- Tableau de bord statique (`.githooks/dashboard.mjs`, module optionnel `optional/dashboard`, skill `drwil-progress`,
  recette `view-progress`) ; sa section « Tendances » est le contrat QUA-198.
- Accueil de session : `docs/intentions/accueil-drwil-a-l-ouverture.md` (gratuit, jamais injecté au modèle). Le message
  `systemMessage` est déjà utilisé pour parler à l'humain seul (`.claude/hooks/reply-glossary.mjs`), pas encore au
  démarrage de session.
- Forges : `.githooks/pr-watch.mjs` sait suivre `gh` et `glab` (QUA-262).

## Questions à trancher

Toutes tranchées par le demandeur le 2026-11-08 (section 4 de la fiche) ; restent les suites, hors première version :

- [décision] Sondages cliquables derrière un jeton, journal des actions, couche OIDC : après la première version.
- [décision] Chat web intégré : intention distincte, plus tard.
