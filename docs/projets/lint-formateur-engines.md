# Projet : lint, formateur et versions de Node déclarées

**Statut** : cadré le 2026-10-11 — décisions prises, lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - package.json
  - package-lock.json
  - biome.json
  - .drwil/ia-first.json
  - .github/workflows/ia-first.yml
  - .github/ruleset-master.json
  - packages/drwil/package.json
  - packages/drwil/README.md
  - README.md
  - INSTALL.md
  - packages/drwil/src/*
  - packages/drwil/test/*
  - packages/drwil/bin/*
  - packages/drwil/templates/common/base/.githooks/*
  - packages/drwil/templates/common/optional/creer-une-release/*
  - packages/drwil/templates/common/optional/tableau-de-bord/*
  - packages/drwil/templates/common/optional/front-quality/*
  - packages/drwil/templates/common/tools/claude/.claude/hooks/*
  - .claude/hooks/garde-fou-bash.mjs
  - .claude/hooks/rappel-cadrage.mjs
  - .claude/hooks/saisie-drwil.mjs
  - .github/scripts/verifier-ruleset.mjs
  - outils/verifier-miroirs.mjs
  - outils/verifier-miroirs.test.mjs
  - outils/audit-dependances.mjs
  - outils/audit-dependances.test.mjs
  - .githooks/cadrage.mjs
  - .githooks/cadrage.test.mjs
  - .githooks/check-code-rules.mjs
  - .githooks/check-code-rules.test.mjs
  - .githooks/check-control-coverage.mjs
  - .githooks/check-control-coverage.test.mjs
  - .githooks/check-docs.mjs
  - .githooks/check-docs.test.mjs
  - .githooks/check-file-size.mjs
  - .githooks/check-file-size.test.mjs
  - .githooks/contrats.mjs
  - .githooks/contrats.test.mjs
  - .githooks/creer-release.mjs
  - .githooks/creer-release.test.mjs
  - .githooks/etat.mjs
  - .githooks/etat.test.mjs
  - .githooks/glob.mjs
  - .githooks/glob.test.mjs
  - .githooks/moteur.mjs
  - .githooks/moteur.test.mjs
  - .githooks/perimetre.mjs
  - .githooks/perimetre.test.mjs
  - .githooks/risque.mjs
  - .githooks/risque.test.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - .githooks/tableau-de-bord.mjs
  - .githooks/tableau-de-bord.test.mjs
-->

(cadrage : ce dépôt d'abord — QUA-018 (périmètre explicite : dépôt drwil vs
livrable gabarit) : Biome est un outil du dépôt, jamais livré ; mais le
formatage touche aussi les hooks et modules livrés, gardés identiques à
leurs copies du dépôt par le contrôle des miroirs ; la déclaration des
versions de Node vaut pour le paquet livré. HIGH imposé : `.github/` et
`.drwil/`.)

## 1. Besoin

Vague 1 de la feuille de route (`docs/projets/en-attente.md`). Constats du
2026-10-11 :

- aucun lint ni formateur : le style tient à la discipline de l'agent ;
- aucun champ `engines` : le README promet « Node.js 20+ », la CI ne
  teste que Node 24 — une promesse non vérifiée.

Contrats candidats réalisés : v1:COD-002, v1:COD-003, v1:PKG-001
(`docs/intentions/catalogue-cycle-de-vie.md`).

## 2. Hors périmètre

- Livrer un lint aux projets équipés (chaque projet déclare le sien,
  `.drwil/ia-first.json` → `checks`).
- Les règles d'hygiène propres au projet (`.githooks/check-code-rules.mjs`).
- Le code applicatif : aucun changement de comportement ; un défaut révélé
  par le lint se corrige dans un commit séparé, avec son test.

## 3. Contraintes

- Configuration alignée sur le style existant (guillemets doubles,
  points-virgules, 2 espaces, lignes longues), pour un diff de formatage
  minimal ; les fichiers à variables du gabarit (`{{…}}`, JSON invalide
  avant rendu) sont exclus.
- Hooks et modules livrés reformatés à l'identique de leurs copies du
  dépôt (contrôle `miroirs-gabarit`).
- Contrôle déclaré dans `.drwil/ia-first.json`, rejoué au commit, au push
  et en CI, comme les autres.
- Les checks exigés par la forge portent un nom
  (`.github/ruleset-master.json` : `kit-tests (ubuntu-latest)`…) : ajouter
  Node 22 à la CI ne doit pas les renommer sans mettre à jour le ruleset,
  sinon une fusion resterait bloquée.

## 4. Décisions

- **2026-10-11 — Biome** pour le lint et le formatage (un seul outil, une
  seule dépendance de développement). [décision utilisateur]
- **2026-10-11 — Node 22 et 24**, déclarés dans `engines` et testés en CI ;
  le README dit « Node.js 22+ ». [décision utilisateur]

## Contrats concernés

- **QUA-011** — Doc jamais fausse : la promesse « Node.js 20+ » non testée.
- **QUA-018** — Périmètre explicite : dépôt drwil vs livrable gabarit.
- **QUA-019** — Pas de contournement d'un contrôle : une règle de lint
  désactivée l'est avec sa raison écrite, jamais en silence.

## 5. Points à trancher

- ~~Outil, versions de Node~~ — tranchés le 2026-10-11 (voir
  « Décisions »).

## 6. Lots

- **Lot 1 — versions de Node** [IA] : `engines` (>= 22) dans
  `packages/drwil/package.json` ; job de CI pour Node 22 sans renommer les
  checks exigés (ou ruleset mis à jour, puis appliqué sur GitHub par le
  demandeur) ; README et INSTALL corrigés. Critère de sortie : CI verte
  sous Node 22 et 24, `verifier-ruleset` vert.
- **Lot 2 — lint** [IA] : Biome en dépendance de développement, règles
  recommandées ; chaque écart corrigé ou la règle désactivée avec sa
  raison ; contrôle déclaré. Critère de sortie : lint vert, contrôle
  rejoué en CI.
- **Lot 3 — formatage** [IA] : formatage appliqué une fois (dépôt et
  gabarit identiques), vérifié ensuite en mode contrôle. Critère de
  sortie : contrôle de formatage vert, tests et miroirs verts.

## 7. Reprise

- **Dernier état** (2026-10-11) : fiche cadrée, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] `/drwil-lancer`.
