# Projet : la CLI en anglais (chantier C du livrable en anglais)

**Statut** : en cours (2026-10-12) — lots 1 et 2 faits, lot 3 à faire.
**Risque** : HIGH

<!-- scope
files:
  - packages/drwil/templates/*
  - packages/drwil/src/*.ts
  - packages/drwil/bin/drwil.js
  - packages/drwil/test/*.test.mjs
  - packages/drwil/README.md
  - packages/drwil/package.json
  - packages/drwil/CHANGELOG.md
  - .githooks/briefs.mjs
  - .githooks/check-control-coverage.mjs
  - .githooks/check-control-coverage.test.mjs
  - .githooks/check-docs.mjs
  - .githooks/check-docs.test.mjs
  - .githooks/commit-msg
  - .githooks/contracts.mjs
  - .githooks/contracts.test.mjs
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - .githooks/risk.mjs
  - .githooks/risk.test.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - .githooks/scope-gate.mjs
  - .githooks/scope-gate.test.mjs
  - .githooks/state.mjs
  - .githooks/state.test.mjs
  - .githooks/state-texts.mjs
  - .claude/hooks/*
  - .claude/skills/*
  - .claude/settings.json
  - outils/installer-depot.mjs
  - outils/installer-depot.test.mjs
  - outils/tester-tarball.mjs
  - outils/tester-tarball.test.mjs
  - outils/verifier-miroirs.mjs
  - outils/verifier-miroirs.test.mjs
  - outils/miroirs.json
  - .github/workflows/ia-first.yml
  - .drwil/ia-first.json
  - package.json
  - package-lock.json
  - AGENTS.md
  - README.md
  - INSTALL.md
  - docs/architecture.md
  - docs/ia-first.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/recipes/*
-->

## 1. Besoin

Dernier des trois chantiers du livrable en anglais
(`docs/intentions/livrable-full-english.md`, ordre B, A, C ; B et A clos,
journal du 2026-10-12). Le cœur est en anglais, mais la CLI ne l'est pas :
son code et ses messages sont en français, deux commandes ont un nom
français (`etat`, `resoudre-derive`), `init` et `apply` font presque la
même chose, et deux messages livrés affichent `DRWIL-012`, un identifiant
interne au dépôt. A a aussi laissé des valeurs françaises visibles hors des
hooks : identifiants de contrôles (`perimetre-attente`…), statuts du moteur
(`echec`, `non-execute`) et sévérités (`bloquant`…), options `--fiche` /
`--demande`, mots tapés `LANCER` / `FUSION`, skill `/drwil-lancer`.

## 2. Hors périmètre

- Contenu des fiches, intentions et journal de ce dépôt : restent en
  français.
- Libellés des tests propres au dépôt (`.githooks/*.test.mjs`, `outils/`) :
  restent en français ; ils suivent seulement les renommages.
- Les mots-clés reconnus dans le contenu des projets (`Règle`, `Contrôle`,
  `Sévérité`, `Points à trancher`, `bloquant`…) : contenu écrit dans la
  langue du projet, toujours accepté dans les deux langues.
- La directive `contraste-fond:` du module front-quality (elle vit dans le
  code des projets) et les tolérances de noms français des modèles
  (modele-*, entretien-courant.md).
- La publication npm (vague 7 de l'index).

## 3. Contraintes

- Sans alias (décision du 2026-10-12, reprise de A) : un projet à l'ancien
  format est migré par `drwil init`, idempotent, avec simulation sans
  écriture.
- Renommer les identifiants de contrôles réécrit les champs « Contrôle »
  des registres : le texte de chaque contrat change, donc l'empreinte de
  ses attestations. Ce dépôt et les projets équipés devront ré-attester
  leurs contrats MANUAL (geste humain, `drwil attest`).
- Aucun contournement (QUA-019) : élargir le cadrage dans un commit qui ne
  touche que la fiche ; une bascule qui change ce que lit la barrière se
  prépare comme en A.
- Fichiers livrés : on n'édite que le gabarit, puis
  `npm run installer-depot`.
- Changement cassant : version mineure (0.x) et note de version explicite.
- Couverture du paquet et des hooks : ne baisse pas.

## 4. Décisions

- **2026-10-11 / 2026-10-12** — Héritées de l'intention et de A : français
  hors du livrable, glossaire, migration en une fois sans alias, commande
  unique `init` / `apply` faite dans C (demandeur).
- **2026-10-12 — Messages de la CLI selon le projet** (demandeur) :
  dictionnaire fr/en choisi par `lang` de `.drwil/ia-first.json`, comme les
  hooks ; hors projet (avant installation), l'anglais.
- **2026-10-12 — Commande unique : `drwil init`** (demandeur) : détecte une
  installation existante (neuve : installe ; existante : met à jour et
  signale la dérive) ; `apply` disparaît, sans alias ; `--dry-run` montre ce
  qui serait fait (l'aperçu d'`apply`), `--force` garde son sens.
- **2026-10-12 — Valeurs laissées par A, toutes en anglais** (demandeur) :
  identifiants de contrôles, statuts du moteur et sévérités ; la migration
  réécrit les champs « Contrôle » des registres de contrats.
- **2026-10-12 — Une seule PR, plusieurs lots** (demandeur), dépôt vert à
  chaque commit.

## Contrats concernés

- **QUA-018** — Périmètre explicite : dépôt drwil vs livrable gabarit :
  modifier le gabarit et la CLI, le dépôt suit par `installer-depot`.
- **QUA-011** — Doc jamais fausse : chaque commande, option ou valeur
  renommée l'est partout dans le même commit.
- **QUA-013** — Un contrôle non exécuté n'est jamais un succès : le
  renommage des statuts du moteur ne doit faire passer aucun « non
  exécuté » pour un succès.
- **QUA-004** — Seuil de couverture : ne baisse pas.
- **QUA-019** — Pas de contournement : bascule sans `--no-verify`.
- **QUA-001** — Fichier de code plafonné : les dictionnaires de messages ne
  font dépasser aucun fichier de 400 lignes.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — La CLI en anglais** [IA] : identifiants, structures et
  commentaires de `packages/drwil/src` et `packages/drwil/bin/drwil.js` en anglais ;
  messages en dictionnaire fr/en selon `lang` (anglais hors projet) ; le
  pont de `packages/drwil/src/verify.ts` disparaît. Critère de sortie : aucun changement de
  comportement pour un projet français, tests verts, couverture tenue.
- **Lot 2 — Valeurs laissées par A** [IA] : identifiants de contrôles
  (`secrets-fichiers`, `perimetre-attente`, `controles-autotest`,
  `couverture-ci`, `branche-principale`, préfixe `projet:`), statuts du
  moteur et sévérités internes en anglais ; options `--fiche` /
  `--demande`, mots tapés `LANCER` / `FUSION`, en-têtes de sondage et skill
  `/drwil-lancer` renommés ; migration des registres de contrats (champ
  « Contrôle ») et des réglages qui citent un identifiant ; ce dépôt migré.
  Critère de sortie : `run-checks` vert, `drwil verify` PASS après
  ré-attestation humaine, projet type à l'ancien format migré et vert.
- **Lot 3 — Commandes** [IA] : commande unique `drwil init` (`apply`
  retiré) ; `etat` → `state`, `resoudre-derive` → `resolve-drift` (option
  `--forcer` → `--force`) ; `DRWIL-012` retiré des deux messages livrés.
  Critère de sortie : tarball vert, aide de la CLI sans nom français.
- **Lot 4 — Docs et version** [IA] : README du paquet et du dépôt, recettes,
  `docs/ia-first.md`, skills et `AGENTS.md` alignés ; version 0.5.0 et note
  de version. Critère de sortie : check-docs et miroirs verts, aucune
  référence à `apply` ni aux anciens noms hors note de version et journal.

## 7. Reprise

- **Dernier état** (2026-10-12) : lot 1 fait. Code de la CLI en anglais
  (fichiers renommés : render.ts, manifest.ts, drift.ts,
  preview.ts) ; messages en dictionnaire fr/en par `packages/drwil/src/i18n.ts`
  (langue du projet, ou celle demandée par `--lang` pour l'aperçu ; anglais
  hors projet) ; pont de `packages/drwil/src/verify.ts` retiré ; empreinte des attestations
  inchangée (clés hachées gardées). Trouvé en route : `doctor` cherchait le
  manifeste sous son ancien nom et avertissait à tort (corrigé) ; la carte
  `docs/architecture.md` décrivait encore un gabarit par langue (corrigé).
- **Lot 2** (2026-10-12) : identifiants de contrôles (`secrets`,
  `scope-gate`, `checks-self-test`, `ci-coverage`, `main-branch`, préfixe
  `project:`), statuts du moteur (`fail`, `not-run`, `not-applicable`),
  sévérités internes (`blocking`, `warning`, `advisory` ; le registre lit
  toujours les deux langues), marqueur `[REDACTED]`, options `--brief` /
  `--request`, mots tapés `START` / `MERGE`, sondage et skill `/drwil-start`.
  Migration des registres : étape à part, qui ne réécrit que le registre et
  le catalogue. Registre de ce dépôt migré ; QUA-013 (contrôle non exécuté
  jamais vert) est à ré-attester (son texte cite les identifiants).
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] lot 3, commandes ; [humain] ré-attester QUA-013
  avant la clôture.
