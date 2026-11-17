# Projet : `close.mjs --fix` n'applique que les corrections, une clôture faite n'est pas refusée, un renvoi réorienté reste juste

**Statut** : cadré le 2026-11-15.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/notes.md` (note du 2026-11-15, chantier consommation-copilot-cli)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/.githooks/close-texts.mjs
  - packages/drwil/templates/common/base/.githooks/close-mechanics.mjs
  - packages/drwil/templates/common/base/.githooks/close-done.mjs
  - packages/drwil/templates/common/base/.githooks/doc-coherence.mjs
  - packages/drwil/templates/common/base/.githooks/doc-coherence-texts.mjs
  - .githooks/close.mjs
  - .githooks/close-texts.mjs
  - .githooks/close-mechanics.mjs
  - .githooks/close-done.mjs
  - .githooks/doc-coherence.mjs
  - .githooks/doc-coherence-texts.mjs
  - .githooks/close.test.mjs
  - .githooks/doc-coherence.test.mjs
  - docs/contracts.md
  - docs/intentions/notes.md
  - docs/intentions/garanties-la-suite.md
  - docs/intentions/retours-du-demandeur-0-11-2.md
  - docs/projects/release-feu-vert-et-squash.md
  - docs/projects/fin-des-sous-agents-de-chantier.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
-->

## 1. Besoin

Au chantier consommation-copilot-cli (2026-11-15), `node .githooks/close.mjs --fix` a fait toute la clôture (preuve
écrite, fiche supprimée, index mis à jour, consommation consignée) au lieu d'appliquer seulement les corrections
proposées ; le `node .githooks/close.mjs` lancé ensuite a refusé à tort : « les critères de la fiche ne sont plus ceux que l'humain
a acceptés au lancement (empreinte sha256:…, aujourd'hui —) ». Causes, lues dans le code le 2026-11-15 :

- **`--fix` fait la mécanique** : `close()` lance `closingMechanics` dès que `check` est faux
  (`.githooks/close.mjs:147`), que `--fix` soit là ou non ; or la proposition de `--check` dit « `node
  .githooks/close.mjs --fix` les applique » (`.githooks/close-texts.mjs:26`, et `:59` en anglais) : suivre le
  message clôt le chantier.
- **Une clôture faite n'est pas reconnue** : relancé, `close()` relit une fiche absente comme un texte vide
  (`.githooks/close.mjs:145`) ; `closureProof` compare l'empreinte acceptée à celle d'un texte vide
  (`.githooks/closure-proof.mjs:82-83`, `acceptanceCheck` de `.githooks/state-acceptance.mjs:107`) et refuse avec
  « aujourd'hui — ». Rien ne dit que la preuve est déjà écrite et la fiche déjà retirée.
- **`--check` ne voit pas des critères modifiés** : `closingReport` (`.githooks/close.mjs:79-107`) ne consulte pas
  `acceptanceCheck` ; seule la mécanique le fait. `--check` peut dire « rien ne ferait échouer la clôture » puis la
  clôture refuser pour des critères modifiés depuis leur acceptation (QUA-174).
- **Un renvoi réorienté devient une phrase fausse** : la réorientation remplace mécaniquement la citation de la
  fiche close par le chemin du journal, quelle que soit la phrase (`redirect`, `.githooks/doc-coherence.mjs:101`,
  appliqué ligne 130). Exemples écrits ainsi : « à lancer après `docs/projects/journal.md` »
  (`docs/projects/release-feu-vert-et-squash.md:5` et `:101`), « touchent le même code que
  `docs/projects/journal.md` » (`docs/intentions/garanties-la-suite.md:10`), « défaut de couverture cadré dans
  `docs/projects/journal.md` » (`docs/intentions/retours-du-demandeur-0-11-2.md:29`), et l'origine de QUA-309,
  « journaux lus par `docs/projects/journal.md` » (`docs/contracts.md`, recopiée d'une fiche réorientée).

## Critères d'acceptation

- `node .githooks/close.mjs --fix` écrit seulement les corrections proposées, en CLOSING comme ailleurs : ni preuve,
  ni fiche supprimée, ni index touché, ni consommation consignée ; le message de proposition donne la commande de
  clôture à lancer ensuite — `QUA-076`
- `node .githooks/close.mjs` relancé sur une clôture déjà faite (fiche absente de la copie de travail, preuve
  écrite, ligne d'index retirée) dit « clôture déjà faite » avec ce qui a été fait, code 0, sans rien réécrire ni
  consigner une seconde fois la consommation, et ne parle jamais d'empreinte modifiée — `QUA-048`
- `node .githooks/close.mjs --check` (et le passage de BUILD à EVIDENCE) signale des critères d'acceptation modifiés
  depuis leur acceptation, avec le même texte que le refus de la clôture : jamais « rien ne ferait échouer » quand la
  clôture refuserait pour cette raison — `QUA-048`
- Une citation de la fiche close n'est réorientée vers le journal que dans une forme de simple renvoi (entre
  parenthèses, « voir … », après un tiret en fin de ligne) ; dans toute autre phrase, elle est signalée « à réécrire
  à la main », sans correction proposée ni écrite — `QUA-076`
- Les phrases fausses déjà écrites par une réorientation, relevées au besoin ci-dessus, sont réécrites à la main —
  `QUA-076`
- Tests : `--fix` en CLOSING sans mécanique ; clôture relancée après une clôture faite ; `--check` sur critère
  modifié ; renvoi dans une phrase signalé, renvoi entre parenthèses réorienté ; en échec contre le code actuel —
  `QUA-048`, `QUA-076`

## Contrats modifiés

- `QUA-076` — ancien critère : « une référence morte — vers la fiche du chantier qui se clôt, elle est réorientée vers le journal » ; `--fix` n'était pas distingué de la clôture — raison : `--fix` n'écrit que les corrections ; la réorientation n'est proposée que pour un simple renvoi, toute autre phrase est à réécrire à la main (validé par le demandeur le 2026-11-15)
- `QUA-048` — ancien critère : « les mêmes signaux sont donnés par `--check` » sans les critères modifiés depuis l'acceptation, et une clôture relancée n'était pas reconnue — raison : `--check` signale des critères modifiés ; une clôture déjà faite est dite, sans refus ni seconde écriture (validé par le demandeur le 2026-11-15)
- `QUA-309` — origine recopiée d'une phrase réorientée à tort (« journaux lus par `docs/projects/journal.md` ») — raison : la phrase d'origine citait la fiche du lecteur de Copilot CLI ; écrire « journaux lus par le lecteur de Copilot CLI (QUA-042) » (validé par le demandeur le 2026-11-15)
- `.githooks/close.mjs` — `--fix` sans mécanique, signal des critères modifiés, clôture faite reconnue (validé par le demandeur le 2026-11-15)
- `.githooks/close-texts.mjs` — message de proposition et message « clôture déjà faite » (validé par le demandeur le 2026-11-15)
- `.githooks/close-mechanics.mjs` — rien de réécrit ni de consigné une seconde fois sur une clôture faite (validé par le demandeur le 2026-11-15)
- `.githooks/doc-coherence.mjs` — réorientation limitée aux simples renvois (validé par le demandeur le 2026-11-15)
- `.githooks/doc-coherence-texts.mjs` — message « à réécrire à la main » d'un renvoi dans une phrase (validé par le demandeur le 2026-11-15)

## 2. Hors périmètre

- L'empreinte des critères elle-même (`.githooks/state-acceptance.mjs`) : traitée par
  `docs/projects/marque-humain-et-empreinte-des-criteres.md`.
- La réorientation des citations d'une fiche dans le code (`codeCitations`) : déjà « à réécrire à la main ».
- Réécrire une phrase par une machine (reformulation) : seul un humain ou l'agent réécrit, la machine signale.

## 3. Contraintes

- Reproduire d'abord : chaque test échoue contre le code actuel (`--fix` en CLOSING supprime la fiche ; relance après
  clôture refusée par l'empreinte ; `--check` muet sur un critère modifié ; « après `x` » réorienté).
- `.githooks/close.mjs` est à 193 lignes sur un plafond de 200 (QUA-001) : la reconnaissance d'une clôture faite va
  dans un module à part (par exemple close-done.mjs, à créer à côté de `.githooks/close.mjs`).
- « Non exécuté » n'est jamais « passé » (QUA-013) : une clôture faite n'est reconnue que sur ses trois traces
  (fiche absente, preuve présente, ligne d'index absente) ; une seule manquante, la clôture suit son cours normal.
- On édite le gabarit puis `npm run installer-depot` (QUA-018) ; couverture à 100 % des hooks (QUA-004).

## 4. Décisions

- 2026-11-15 (choix de cadrage, le plus sûr, validé par le demandeur) : les deux voies sont prises — `--fix`
  n'applique que les corrections, et une clôture déjà faite est reconnue ; un renvoi qui n'est pas un simple renvoi
  est signalé, jamais réécrit par la machine.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — `--fix`, clôture faite, `--check`** [IA] : tests en échec d'abord ; `--fix` sans mécanique, message de
  proposition, module de reconnaissance d'une clôture faite, critères modifiés dans `closingReport` ; QUA-048 et
  QUA-076 réécrits ; `npm run installer-depot`. Critère de sortie : tests de `.githooks/close.test.mjs` verts,
  couverture des hooks à 100 %.
- **Lot 2 — renvois réorientés justes** [IA] : tests en échec d'abord ; réorientation limitée aux simples renvois,
  signal « à réécrire » sinon ; phrases fausses existantes réécrites (liste du besoin, origine de QUA-309) ; ligne
  « Unreleased » du CHANGELOG ; note d'origine retirée de `docs/intentions/notes.md`. Critère de sortie :
  `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-15) : cadrage terminé, contenu validé par le demandeur le 2026-11-15.
- **Prochaine étape** : [humain] `/drwil-start`.
