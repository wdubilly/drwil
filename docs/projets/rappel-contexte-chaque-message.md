# Projet : rappel court de l'état de gouvernance à chaque message

**Statut** : cadré le 2026-10-10 — en attente de démarrage.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - packages/drwil/templates/common/base/.githooks/etat.mjs
  - packages/drwil/templates/common/base/.githooks/etat.test.mjs
  - .githooks/etat.mjs
  - .githooks/etat.test.mjs
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - .claude/settings.json
  - packages/drwil/templates/fr/base/AGENTS.md
  - packages/drwil/templates/en/base/AGENTS.md
  - AGENTS.md
  - packages/drwil/templates/fr/base/docs/ia-first.md
  - packages/drwil/templates/en/base/docs/ia-first.md
  - packages/drwil/test/kit.test.mjs
-->

(cadrage : un mode court de `.githooks/etat.mjs`, branché sur la saisie de
l'utilisateur dans Claude Code, la consigne d'`AGENTS.md` pour les autres
outils et la doc, côté dépôt et côté gabarit — QUA-018.)

## 1. Besoin

Levier 7 de `docs/intentions/fluidite-sans-perte-de-rigueur.md`. L'état de
gouvernance n'est réinjecté à l'agent qu'au démarrage de la session (hook
`SessionStart` de Claude Code) ou quand l'agent suit la consigne
d'`AGENTS.md` en début de tâche. Au fil d'une longue session, ou après un
résumé automatique du contexte, l'agent peut dériver : oublier l'activité,
la fiche active ou le périmètre. Constaté le 2026-10-09 : l'agent relançait
l'état par discipline, sans mécanisme pour le lui rappeler.

Intention : à chaque message de l'utilisateur, injecter un rappel **court**
(3 ou 4 lignes), lu sur disque — activité, fiche active, taille du
périmètre, règle de l'activité.

## 2. Hors périmètre

- Toute garantie : le rappel est une barrière comportementale ; la garantie
  reste dans Git (barrière au commit, CI).
- Le lancement d'un chantier depuis le chat
  (`docs/projets/fluidite-gestes-humains.md`).

## 3. Contraintes

- Coût en tokens borné : quelques dizaines par message au plus.
- Agnostique : la logique dans `.githooks/etat.mjs` ; Claude Code par son
  hook de saisie (`UserPromptSubmit`) ; un outil sans hook de saisie par la
  consigne d'`AGENTS.md` (relancer l'état avant toute modification).
- Ne jamais casser une saisie : en cas d'erreur, le hook n'injecte rien et
  laisse passer le message.

## 4. Décisions

- **2026-10-10 — Rappel court à chaque message** : retenu par le
  demandeur, comme levier 7 de l'intention fluidité, en fiche séparée du
  lancement depuis le chat. [décision utilisateur]
- **2026-10-10 — Fréquence : le moins souvent possible, au moment utile**
  (point 5 tranché) : au démarrage de la session (déjà en place,
  `SessionStart`) ; après un résumé automatique du contexte (le même hook
  le couvrirait dans Claude Code : à vérifier) ; et à un message seulement
  si l'état a changé depuis le dernier rappel (lancement, clôture,
  changement d'activité). Sinon rien n'est injecté, sans coût. Le moment
  d'écrire un fichier est déjà couvert par le hook `rappel-cadrage`, qui
  refuse l'écriture hors cadrage. [décision utilisateur]

## Contrats concernés

- **QUA-015** — Chantiers exploitables à froid : l'agent ne tient pas
  l'état de mémoire, il le relit sur disque.
- **QUA-016** — Rappel de cadrage : le rappel porte le périmètre de la
  fiche active.

## 5. Points à trancher

- ~~Fréquence~~ — tranchée le 2026-10-10 (voir « Décisions »).
- [décision] Où retenir le dernier rappel injecté (pour ne réinjecter que
  sur changement) : fichier local ignoré par Git sous `.drwil/`, ce qui
  ajoute `.gitignore` au cadrage, ou dossier temporaire du système ?
- [décision] Copilot CLI : a-t-il un hook de saisie ? À vérifier par le
  test témoin ; sinon, consigne seule.

## 6. Lots

- **Lot 1 — rappel court** [IA] : mode court de `.githooks/etat.mjs`
  (3 ou 4 lignes), hook de saisie dans Claude Code, consigne d'`AGENTS.md`
  renforcée, doc. Critère de sortie : tests (rappel court, état neutre,
  état invalide, gouvernance désactivée : rien ou « désactivée ») ; rappel
  visible à chaque message dans une session réelle ; contrôles et CI verts.

## 7. Reprise

- **Dernier état** (2026-10-10) : fiche cadrée, rien de réalisé.
- **Travail non commité** : aucun après le commit de cette fiche.
- **Prochaine étape** : [décision] où retenir le dernier rappel ; [IA]
  vérifier que `SessionStart` se déclenche après un résumé du contexte ;
  puis lancer.
