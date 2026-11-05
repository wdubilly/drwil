# Intention : la mise à jour du kit garde au manifeste l'empreinte des fichiers qu'elle complète

**Statut** : proposée le 2026-11-05 — défaut de drwil 0.11.0 constaté par le demandeur sur un projet déjà
équipé, mis à jour par `drwil init` ; cause relevée dans le code le même jour (lecture seule, non reproduite
par un test).

**Revu le 2026-11-05** : cadrée le jour même en fiche, `docs/projects/journal.md`
(correction côté `init`, empreinte à part pour un fichier modifié à la main, nouveau contrat, 0.11.1 commune) ;
questions tranchées.

## Besoin

Sur un projet déjà équipé, le commit de la mise à jour du kit est refusé par la barrière de périmètre. Le
contrôle des fichiers du kit (`nonKitFiles`, `.githooks/scope-gate-kit.mjs`) n'admet un fichier que si son
empreinte (sha256) dans l'index est celle du manifeste (.drwil/installed-files.json, chez le projet équipé). Or `init` complète
deux fichiers sans mettre leur empreinte à jour au manifeste :

- `.gitignore` : une ligne .drwil/lot.json ajoutée ;
- `docs/projects/kit-mechanics.md` : un bloc de 17 lignes ajouté à son bloc `scope`.

Le manifeste garde l'ancienne empreinte, l'index en porte une autre : la barrière les juge « hors kit » et
refuse le commit. Le message de refus ne nommait qu'un seul fichier : écart non élucidé.

## Existant (relevé le 2026-11-05)

- `packages/drwil/src/index.ts`, `init` : le manifeste de la passe (`manifest`) part vide ; `scaffold` n'y
  inscrit que les fichiers qu'il écrit. Un fichier de projet déjà présent (`.gitignore`,
  `docs/projects/kit-mechanics.md`) n'est pas réécrit, donc absent de ce manifeste.
- `packages/drwil/src/complete.ts`, `complete` : après écriture, l'empreinte n'est mise à jour que si
  `rel in opts.manifest` (« un fichier que cette même installation a créé, puis complété »). Les deux
  fichiers complétés n'y sont pas : leur empreinte n'est pas recalculée.
- `packages/drwil/src/manifest.ts`, `writeManifest` : fusionne l'ancien manifeste et celui de la passe ;
  l'ancienne empreinte des deux fichiers est donc conservée.
- `packages/drwil/templates/common/base/.githooks/scope-gate-kit.mjs`, `nonKitFiles` : un fichier présent
  après le commit doit porter l'empreinte du manifeste d'après ; sinon il est jugé comme dans un commit
  ordinaire, donc hors périmètre en SCOPING.
- Aucun test relevé ne joue une mise à jour d'un projet déjà équipé où `complete` ajoute à un fichier
  inscrit au manifeste d'une installation précédente (hypothèse du demandeur, non vérifiée).

## Questions à trancher

- [décision] Côté corrigé : `complete` recalcule l'empreinte de tout fichier qu'il complète et que le
  manifeste précédent tient déjà (piste la plus directe), ou la barrière tolère un ajout dans un bloc
  balisé par le kit ?
- [décision] Un fichier du manifeste modifié à la main par le projet, puis complété par `init` : reste-t-il
  au kit (empreinte recalculée) ou sort-il du manifeste ?
- [décision] Le contrat : un nouveau contrat (« une mise à jour complète un fichier sans faire refuser son
  commit »), prouvé par un test qui installe la version précédente puis met à jour, ou l'extension de
  QUA-237 (`drwil init` sur un projet équipé commite la mise à jour sur sa branche dédiée) ?
- [décision] Publier un correctif 0.11.1 dès la correction (patch direct, `release.mode` solo), avant la
  0.12.0 ?
