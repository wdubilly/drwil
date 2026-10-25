# Projet : `drwil verify` reprend les verdicts de `run-checks` sur un arbre identique

**Statut** : cadré le 2026-10-25.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/suivi-ci-et-contexte.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - packages/drwil/src/verify.ts
  - packages/drwil/src/evidence.ts
  - packages/drwil/src/agent.ts
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/suivi-ci-et-contexte.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

En fin de chantier, `run-checks` joue tous les contrôles, puis `drwil verify`
les rejoue un par un sur le même code : le 2026-10-25, un `verify --evidence`
a pris ≈ 4 min 30, dont la suite complète du paquet avec couverture, déjà
jouée juste avant par `run-checks`. Il faut que `verify` reprenne le verdict
d'un contrôle que `run-checks` vient de jouer sur un arbre identique, au lieu
de le rejouer, sans qu'un verdict ancien ou pris sur un autre code puisse
compter.

## Critères d'acceptation

(le contrat est à créer au lancement, avec son champ **Origine** ; ID
à attribuer à ce moment-là dans le registre.)

- `drwil verify` reprend le verdict d'un contrôle joué par `run-checks` sur
  un arbre et une configuration identiques, le dit dans sa preuve, contrat
  par contrat, et rejoue tout contrôle dont l'empreinte diffère, dont le
  verdict manque ou qui dépend de l'extérieur — contrat à créer
- Un contrôle repris a bien tourné : QUA-013 le dit — `QUA-013` modifié

## Contrats modifiés

- `QUA-013` — ancien critère : « Un contrôle qui n'a pas tourné n'est pas un
  contrôle passé. […] une preuve absente, périmée ou non rejouée ne vaut
  jamais un succès, en local comme en CI. » — raison : un verdict de
  `run-checks` pris sur un arbre et une configuration identiques est une
  exécution du contrôle sur ce même code, pas une preuve périmée ; la règle
  le précise, et tout autre verdict repris reste un échec (validé le
  2026-10-25)

## 2. Hors périmètre

- La CI : elle rejoue toujours tout, c'est le filet.
- Reprendre un verdict pris sur un arbre qui diffère, même par la seule doc.
- Reprendre un verdict d'une passe de hook (pre-commit, pre-push) : elle
  juge l'index ou la référence poussée, pas l'arbre entier que juge `verify`.

## 3. Contraintes

- Livré à tout projet (gabarit `packages/drwil/templates/common/base/`).
- L'empreinte couvre le commit, les modifications non commitées (fichiers
  suivis et non suivis non ignorés) et la configuration du contrôle
  (`.drwil/ia-first.json`) : un seul octet de différence, et le contrôle est
  rejoué.
- Un contrôle qui dépend de l'extérieur (réseau, forge, heure) est toujours
  rejoué.

## 4. Décisions

(validées par le demandeur le 2026-10-25)

1. Seuls les verdicts « ok » et « fail » sont repris ; « non exécuté », «
   non applicable » ou inconnu, jamais.
2. Seule une passe de `run-checks` lancée hors hook (arbre entier, comme
   `verify`) laisse des verdicts reprenables.
3. Un contrôle se déclare toujours rejoué par le réglage `reuse: false` dans
   `.drwil/ia-first.json` ; ce dépôt le pose sur ceux qui lisent le réseau ou
   la forge (audit des dépendances, ruleset GitHub).
4. `drwil verify` sans reprise reste possible (`--no-reuse`), et la preuve
   dit pour chaque contrat « repris de `run-checks` du … » ou « rejoué ».

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — verdicts reprenables** [IA] : `run-checks` hors hook écrit, par
  contrôle, son verdict avec l'empreinte de l'arbre et de la configuration
  (`.drwil/evidence/`, hors de git) ; tests du moteur et de `run-checks`.
- **Lot 2 — reprise par `verify`** [IA] : `verify` reprend un verdict à
  empreinte identique, rejoue sinon, et le dit dans sa preuve et dans
  `--agent` ; option `--no-reuse` ; `reuse: false` posé sur les contrôles
  qui lisent l'extérieur ; tests (arbre modifié d'un octet, fichier non
  suivi ajouté, configuration changée, verdict absent, contrôle `reuse:
  false`) ; mesure avant / après sur ce dépôt, consignée au journal ;
  contrat au registre et son contrôle `tests-qua-<id>`, `QUA-013` mis à
  jour ; README du paquet ; ligne « Unreleased » du changelog. Critère de
  sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-25) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
