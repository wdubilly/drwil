# Projet : la mise à jour du kit garde au manifeste l'empreinte des fichiers qu'elle complète

**Statut** : cadré le 2026-11-05.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/empreinte-des-fichiers-completes-par-init.md`

<!-- scope
files:
  - packages/drwil/src/complete.ts
  - packages/drwil/src/index.ts
  - packages/drwil/src/manifest.ts
  - packages/drwil/src/manifest-completed.ts
  - packages/drwil/src/kit-update.ts
  - packages/drwil/templates/common/base/.githooks/scope-gate-kit.mjs
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - .githooks/scope-gate-kit.mjs
  - .githooks/scope-gate.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - docs/projects/kit-mechanics.md
  - docs/architecture.md
  - docs/contracts.md
  - docs/features.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/empreinte-des-fichiers-completes-par-init.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

(`packages/drwil/src/complete.ts` (189 lignes), `packages/drwil/src/index.ts` (197) et
`packages/drwil/src/manifest.ts` (190) sont près du plafond de 200 : la lecture et l'écriture de
l'empreinte à part vont dans manifest-completed.ts, fichier neuf du même dossier, cité par la carte
d'architecture.)

## 1. Besoin

Sur un projet déjà équipé, `drwil init` (0.11.0) complète des fichiers inscrits au manifeste d'une
installation précédente (`.gitignore` : une ligne ; `docs/projects/kit-mechanics.md` : un bloc du
`scope`) sans mettre leur empreinte à jour. La barrière de périmètre, qui n'admet dans le commit de
mise à jour qu'un fichier portant l'empreinte du manifeste, les juge « hors kit » et refuse le commit :
la mise à jour du kit est bloquée sur tout projet équipé. Cause relevée le 2026-11-05 : le manifeste de
la passe (`init`, `packages/drwil/src/index.ts`) ne contient que les fichiers écrits par `scaffold` ;
`complete` ne recalcule une empreinte que pour eux ; `writeManifest` garde l'ancienne pour les autres.

## Critères d'acceptation

(contrat créé au chantier dans le registre, avec son champ **Origine** : QUA-244.)

- Sur un projet équipé par une version précédente, une mise à jour par `init` qui complète un fichier
  du manifeste — intact ou modifié à la main par le projet — commite sans refus de la barrière de
  périmètre ; un fichier intact reçoit sa nouvelle empreinte au manifeste ; un fichier modifié à la main
  garde son empreinte d'installation (`uninstall` et le retrait des fichiers obsolètes ne le suppriment
  toujours pas) et son empreinte après complétion est notée à part, admise par la barrière seulement
  pour le commit de mise à jour ; prouvé par un test qui installe, modifie ou non, met à jour puis
  commite — `QUA-244`

## Contrats modifiés

- `.githooks/scope-gate-kit.mjs` — le contrôle des fichiers du kit admet aussi un fichier dont
  l'empreinte dans l'index est l'empreinte après complétion notée à part par `init` ; toute autre
  empreinte reste refusée (validé par le demandeur le 2026-11-05, réponse « Empreinte à part »)

## 2. Hors périmètre

- La barrière qui tolérerait un ajout dans un bloc balisé sans empreinte (écarté le 2026-11-05).
- L'écart du message de refus qui ne nommait qu'un des deux fichiers : relevé au chantier, corrigé s'il
  tient à la même cause, sinon noté en intention.
- La publication de la 0.11.1 : fiche de version jetable, après ce chantier et la reprise sur un autre
  clone.

## 3. Contraintes

- Livrable : le code de `packages/drwil/src/` et le gabarit ; les copies du dépôt suivent par
  `npm run installer-depot`.
- La barrière garde son principe (QUA-238) : un fichier n'est admis que par une empreinte que `init`
  a écrite, jamais par une édition à la main.
- Plafond de 200 lignes par fichier de code.

## 4. Décisions

- 2026-11-05 (demandeur) : la correction se fait côté `init` (`complete`), à la source.
- 2026-11-05 (demandeur) : fichier intact, empreinte recalculée ; fichier modifié à la main, empreinte
  après complétion notée à part, acceptée par la barrière, ignorée par `uninstall`.
- 2026-11-05 (demandeur) : un nouveau contrat, prouvé par un test de mise à jour réelle.
- 2026-11-05 (demandeur) : publié dans une 0.11.1 commune avec la reprise sur un autre clone.

Contrats concernés : `QUA-237` (`init` sur un projet équipé commite la mise à jour sur sa branche
dédiée), `QUA-238` (la barrière reconnaît la mise à jour du kit par son manifeste).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — empreinte des fichiers complétés** [IA] : `complete` et le manifeste (empreinte recalculée
  ou notée à part), la barrière qui l'admet, test de mise à jour réelle, contrat, carte, changelog.
  Critère de sortie : `drwil verify --evidence` rend `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-05) : cadré, pas lancé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer par `/drwil-start`, en file avant la reprise sur un autre clone.
