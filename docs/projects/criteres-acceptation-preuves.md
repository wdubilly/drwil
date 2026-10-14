# Projet : critères d'acceptation prouvés avant la clôture

**Statut** : cadré le 2026-10-15 — à lancer, aucun lot commencé.
**Risque** : HIGH

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/docs/projects/model-brief.md
  - packages/drwil/src/verify.ts
  - packages/drwil/test/kit.test.mjs
  - .githooks/state.test.mjs
-->

(cadrage provisoire : à confirmer au démarrage de chaque lot ; les copies
du dépôt se régénèrent par `npm run installer-depot`, QUA-018.)

## 1. Besoin

Demande du demandeur (2026-10-15) : l'étape EVIDENCE doit imposer à l'agent
de fournir des preuves **pertinentes pour sa demande**, et ces preuves
doivent être **évaluées avant la clôture**, liées à la fiche et à ses
critères d'acceptation.

Constat du 2026-10-15 : aujourd'hui `verifyEvidence`
(`.githooks/state.mjs`) ne lit que le verdict global de `drwil verify`
(pass ou attested, sur le HEAD, arbre propre), c'est-à-dire l'état des
contrats du registre. Le modèle de fiche n'a qu'un « Critère de sortie » en
texte libre par lot. Rien ne force un critère d'acceptation de la demande à
avoir une preuve : si l'agent n'a créé aucun contrat pour sa demande,
`verify` passe quand même.

## 2. Hors périmètre

- Un dossier de preuves rédigé par l'agent à côté de `verify` : refusé, un
  agent ne se note pas lui-même et cela crée une seconde source de vérité.
- Le versionnement de l'évidence pour comparer deux chantiers (idée de
  non-régression entre verdicts) : piste à cadrer à part.
- Rendre les critères rétroactifs sur les fiches déjà existantes.

## 3. Contraintes

- Les critères d'acceptation ne forment pas un système parallèle : un
  critère vérifiable renvoie à un contrôle ou à un contrat avec `Contrôle`,
  un critère humain à un contrat `Manuel` (`docs/ia-first.md`).
- C'est l'outil qui évalue, jamais l'agent ; l'attestation d'un critère
  humain reste un geste humain (`drwil attest`).
- Gabarit d'abord, puis copie du dépôt (QUA-018) ; compatible avec les
  projets déjà installés (une fiche sans critères structurés ne doit pas
  être bloquée sans décision explicite).
- Contrats concernés à citer au cadrage : QUA-013 (contrôle non exécuté),
  QUA-015 (chantiers exploitables à froid), QUA-016 (rappel de cadrage).

## 4. Décisions

(aucune encore.)

## 5. Points à trancher

- [décision] Forme des critères dans la fiche : une section « Critères
  d'acceptation » avec une ligne par critère, chacun lié à un ID de contrat
  ou de contrôle, ou marqué `[humain]` ? (proposition.)
- [décision] Quand le contrôle s'applique : à l'entrée de VERIFY, de CLOSING,
  ou dans `verify --evidence` ? (proposition : `verify --evidence`, pour que
  l'évidence porte le résultat par critère.)
- [décision] Fiche sans critères structurés : bloquer, avertir, ou bloquer
  seulement pour les fiches créées après la date de mise en service
  (`newRequirements`) ? (proposition : avertir puis bloquer, comme pour les
  exigences ajoutées après coup.)
- [décision] Le tableau « critère → preuve → verdict » : produit par `verify`
  dans l'évidence et rappelé dans le corps de la PR ?

## 6. Increments

- **Lot 1 — modèle** [IA] : section « Critères d'acceptation » dans
  `packages/drwil/templates/common/base/docs/projects/model-brief.md` et
  lecture par `packages/drwil/templates/common/base/.githooks/briefs.mjs`. Critère de sortie : un test lit une fiche avec
  critères et en rend la liste structurée.
- **Lot 2 — évaluation** [IA] : `verify --evidence` évalue chaque critère
  (contrôle ou contrat lié, ou humain à attester) et l'écrit dans
  l'évidence ; `verifyEvidence` refuse un critère sans preuve ou non PASS.
  Critère de sortie : tests verts — critère sans preuve refusé, critère
  humain non attesté refusé, critère prouvé accepté.
- **Lot 3 — vue de relecture** [IA] : tableau « critère → preuve → verdict »
  pour la PR. Critère de sortie : un test sur le rendu.
- **Lot 4 — preuve de bout en bout** [IA] : un test dans
  `packages/drwil/test/cycle.test.mjs` (si présent) rejoue le cycle avec un
  critère non prouvé et vérifie que la clôture est refusée. Critère de
  sortie : vert sur les 3 systèmes.

## 7. Reprise

- **Dernier état** (2026-10-15) : fiche cadrée, aucun code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] trancher les points de la section 5,
  puis lancer le chantier.
