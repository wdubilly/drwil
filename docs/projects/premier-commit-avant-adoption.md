# Projet : `init` rattache le code existant, le premier commit passe

**Statut** : cadré le 2026-10-23.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/premier-commit-avant-adoption.md`

<!-- scope
files:
  - packages/drwil/src/index.ts
  - packages/drwil/src/existing-code.ts
  - packages/drwil/src/i18n.ts
  - packages/drwil/test/existing-code.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/CHANGELOG.md
  - docs/contracts.md
  - docs/architecture.md
  - .drwil/ia-first.json
-->

(cadrage : le livrable, QUA-018 (périmètre explicite : dépôt drwil vs
livrable gabarit) — `init` et la recette d'adoption du gabarit ; la copie
`docs/recipes/adopt-the-kit.md` du dépôt est couverte par `scopeMirrors`.
HIGH : un contrôle se déclare dans `.drwil/ia-first.json`, et le chantier
change ce qu'`init` écrit chez tout utilisateur.)

## 1. Besoin

Juste après `drwil init` sur un projet qui a déjà du code, et avant
l'adoption (`/drwil-adopt`), le premier geste de gouvernance d'un agent est
refusé : le commit d'une **fiche seule** échoue sur une dette antérieure à
lui. Sur une installation neuve, `scopeReminder` et `newRequirements` valent
`blocking` (`packages/drwil/src/config.ts`) : `check-docs` relève chaque
fichier de code hors de toute fiche (QUA-016, rappel de cadrage) et
`architecture-map` chaque dossier de code absent de la carte (QUA-040, carte
entretenue par drwil), sur tout le dépôt, à chaque commit. Constaté au
passage d'essai réel du mini-banc (run 39966784905) : l'agent, qui ne
contourne rien (QUA-019), s'arrête et demande un humain. Un utilisateur qui
saute l'adoption bute dès sa première tâche.

La recette d'adoption (`docs/recipes/adopt-the-kit.md`) construit la carte,
mais ne dit pas comment rattacher le code existant à une fiche.

## Critères d'acceptation

- Sur un projet qui a déjà des fichiers de code indexés, `init` écrit une
  fiche de référence « code existant » dont le bloc `scope` couvre chacun
  d'eux (hors fichiers du kit), et une carte d'architecture qui cite chacun
  de leurs dossiers ; prouvé sur un vrai projet installé : un commit qui ne
  touche qu'une fiche y passe, hooks actifs et réglages bloquants, et
  `run-checks` n'y signale aucun fichier hors fiche ni dossier absent de la
  carte — `QUA-110`
- Un projet neuf (aucun code indexé) et la mise à jour d'un projet déjà
  installé ne changent pas : aucune fiche « code existant » créée, aucune
  fiche ni carte existante réécrite — `QUA-110`
- La recette d'adoption dit ce que devient la fiche « code existant » :
  la carte réécrite depuis le code (étape 1), le code rattaché aux fiches
  des chantiers qui le touchent ensuite, la fiche gardée tant qu'elle
  couvre un fichier — `QUA-041`

## 2. Hors périmètre

- Rendre non bloquante la dette antérieure pour un commit de fiche seule, ou
  orienter la session d'un projet non adopté vers `/drwil-adopt` : écartés
  le 2026-10-23 (décisions ci-dessous).
- Le code non indexé au moment d'`init` (pas encore commité) : il relève du
  rappel de cadrage habituel.
- Les garanties obligatoires lancées par `init` :
  `docs/intentions/init-impose-les-garanties.md`.
- L'adoption fixe de la copie du mini-banc : `docs/projects/banc-copie-adoptee.md`
  (elle pourra s'appuyer sur ce chantier, sans en dépendre).
- La procédure pour un dépôt git existant avant `init` :
  `docs/intentions/guide-de-demarrage.md`.

## 3. Contraintes

- La fiche « code existant » est un **fichier du projet**, comme la carte :
  écrite une seule fois, jamais réécrite par une mise à jour, laissée en
  place par `uninstall` (à vérifier dans le manifeste,
  `packages/drwil/src/manifest.ts`).
- Statut « référence — … » : jamais proposée au lancement (modèle de fiche,
  `docs/projects/model-brief.md`).
- Le bloc `scope` liste les fichiers un par un (un motif trop large est
  refusé, `.githooks/scope.mjs`) ; les fichiers installés par le kit (`.githooks/`,
  réglages des outils) restent couverts par la fiche de mécanique du kit,
  pas par celle-ci.
- « Code » se juge comme le hook (`isCode` de `.githooks/scope.mjs`, avec les
  préfixes du réglage écrit par `init`), pour que la fiche couvre exactement
  ce que le contrôle exige.
- La carte écrite par `init` cite chaque dossier de code avec un rôle
  « à décrire à l'adoption » : le contrôle juge la citation, le rôle reste
  humain (QUA-040).
- Textes en français et en anglais (`packages/drwil/src/i18n.ts`, réglage
  `lang`) ; fichiers de code sous 400 lignes (QUA-001) — d'où un module à
  part, `packages/drwil/src/index.ts` comptant déjà 183 lignes.

## 4. Décisions

- **2026-10-23 — `init` rattache le code existant** (fiche de référence
  « code existant » et carte qui cite ses dossiers), plutôt qu'un commit de
  fiche seule non bloquant (QUA-016 affaibli, et la CI de la PR reste rouge
  sur la même dette) ou qu'un renvoi vers `/drwil-adopt` en début de session
  (rien de débloqué pour qui saute l'adoption). [décision utilisateur, sur
  recommandation]
- **2026-10-23 — Seulement le code indexé** par git au moment d'`init` :
  un projet neuf ne change pas, le code non commité suit le rappel de
  cadrage habituel. [décision utilisateur, sur recommandation]

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — rattachement à `init`** [IA] : un nouveau module (liste du
  code indexé hors kit, fiche de référence, dossiers cités dans la carte),
  appel depuis `init` sur un projet existant, textes, contrat créé et
  ses tests (dont un vrai projet installé où un commit de fiche seule
  passe), recette d'adoption, changelog, carte du dépôt. Critère de
  sortie : tests verts, `run-checks` vert, CI verte.

## 7. Reprise

- **Dernier état** (2026-10-23) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
