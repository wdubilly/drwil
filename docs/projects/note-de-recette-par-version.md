# Projet : une note de recette conservée dans le dépôt, à chaque version

**Statut** : cadré le 2026-10-21 — décisions du demandeur consignées, prête à lancer.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/note-de-recette-par-version.md`

<!-- scope
files:
  - .githooks/recette-note.mjs
  - .githooks/recette-note.test.mjs
  - .githooks/promote-release.mjs
  - .githooks/promote-release.test.mjs
  - .githooks/create-release.mjs
  - .githooks/create-release.test.mjs
  - packages/drwil/templates/common/optional/create-release/recette-note.mjs
  - packages/drwil/templates/common/optional/create-release/promote-release.mjs
  - packages/drwil/templates/common/optional/create-release/create-release.mjs
  - packages/drwil/test/kit.test.mjs
  - outils/miroirs.json
  - .drwil/ia-first.json
  - docs/contracts.md
  - docs/architecture.md
  - docs/recettes/README.md
  - docs/recipes/create-a-release.md
  - packages/drwil/templates/common/base/docs/recipes/create-a-release.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/create-a-release/SKILL.md
  - .claude/skills/create-a-release/SKILL.md
  - docs/intentions/note-de-recette-par-version.md
-->

(cadrage : le module optionnel de release — son nouveau module de note, la
promotion, la création directe d'une release —, ses tests, son gabarit et ses
miroirs, la doc, les contrats et la recette. Aucun code hors du module de
release.)

Cible : drwil-le-livrable (module optionnel du gabarit
`packages/drwil/templates/common/optional/create-release/`), jamais une copie
installée seule (QUA-018, dépôt contre livrable).

## 1. Besoin

La fiche de recette et le verdict d'une version n'existent que sur la
pré-release GitHub : ils ne suivent pas le code et se perdraient avec la
forge. À chaque version, le dépôt doit garder une note : ce qui a été validé,
par qui, avec quel verdict.

## Critères d'acceptation

- La promotion d'une candidate approuvée écrit la note de la version dans
  `docs/recettes/<version>.md` — la fiche de recette, le verdict, les
  réserves, l'auteur et la date du verdict, le sha256 de chaque tarball —
  sur une branche dédiée et une PR, jamais sur la branche principale ;
  `--dry-run` montre la note sans rien écrire — `QUA-078`
- Une version publiée sans candidate ni verdict reçoit quand même sa note,
  générée avec la mention « sans verdict », à compléter par l'humain —
  `QUA-079`
- Le tag et la release GitHub ne dépendent pas de la PR de la note : si la
  branche, la PR ou l'écriture échoue, la promotion le dit avec la commande
  de rattrapage, sans défaire ce qui est publié — `QUA-080`

## Contrats modifiés

- `QUA-054` — ancien critère : « la promotion pose le tag vX.Y.Z sur le
  commit de la candidate, le pousse, et crée la release définitive (latest)
  avec le même tarball » et ne modifie aucun fichier suivi — raison : elle
  ouvre en plus une PR qui porte la note de recette dans le dépôt (validé le
  2026-10-21, décision « une PR par version »)

## 2. Hors périmètre

- La fiche de recette en HTML (`docs/intentions/fiche-de-recette-html.md`) et
  la fiche après squash (`docs/intentions/fiche-recette-apres-squash.md`).
- Rétro-écrire les notes des versions déjà publiées.
- La publication npm.
- Le verdict lui-même (`.githooks/release-verdict.mjs`, geste humain), non
  modifié.

## 3. Contraintes

- La branche principale est protégée (QUA-017) : la note arrive par une PR,
  une par version ; la promotion ne commite jamais sur la branche principale.
- Le tag et la release restent publiés même si la PR de la note échoue : la
  note se rattrape, une release publiée ne se défait pas.
- `.githooks/create-release.mjs` (309 lignes) et
  `.githooks/promote-release.mjs` (165 lignes) : la logique de la note va dans
  un nouveau module `.githooks/recette-note.mjs` (à créer), fichiers plafonnés à 400
  lignes (QUA-001).
- La note est générée (acceptance-sheet, verdict), jamais écrite à la main,
  sauf la partie à compléter d'une version sans verdict.
- On n'édite que le gabarit livré et son miroir déclaré (`miroirs-gabarit`).
- Une action extérieure (tag, release, PR) attend toujours le oui du
  demandeur après un `--dry-run` ; le verdict reste humain, jamais lancé par
  l'agent.

## 4. Décisions

Prises par le demandeur le 2026-10-21 :

- Où : un fichier par version, `docs/recettes/<version>.md`.
- Qui l'écrit : la promotion copie la fiche et le verdict dans le dépôt.
- Arrivée : une PR par version, la branche principale étant protégée.
- Contenu : le verdict, les réserves, l'auteur et la date du verdict, le
  sha256 du tarball, en plus de la fiche générée.
- Version sans verdict : note générée avec la mention « sans verdict », à
  compléter par l'humain ; la note reste obligatoire.
- Ordre : après la clôture qui vérifie la cohérence de la documentation
  (fait), avant la 0.7.0.

## 5. Points à trancher

Aucun : tranchés le 2026-10-21 (voir ci-dessus).

## 6. Lots

- **Lot 1 — module de note** [IA] : `.githooks/recette-note.mjs` (à créer) produit le
  texte de la note (fiche, verdict, réserves, auteur, date, empreintes ;
  mention « sans verdict »). Critère de sortie : tests sur les trois cas
  (approuvée, avec réserves, sans verdict).
- **Lot 2 — promotion** [IA] : la promotion écrit la note sur une branche
  dédiée, ouvre la PR, `--dry-run` la montre ; échec de la PR signalé avec la
  commande de rattrapage. Critère de sortie : tests sur dépôts git temporaires
  (origin nu local), gh simulé.
- **Lot 3 — release sans candidate** [IA] : `.githooks/create-release.mjs` (version
  sans candidate) produit la note « sans verdict » par le même module.
- **Lot 4 — gabarit, doc, contrats** [IA] : gabarit et miroirs, recette et
  skill de release, carte d'architecture, `docs/recettes/README.md` (à créer), les
  contrats créés avec leurs contrôles dans `.drwil/ia-first.json`, QUA-054
  modifié.

## 7. Reprise

- **Dernier état** (2026-10-21) : cadré, rien de commencé ; décisions
  consignées ci-dessus ; tout est tranché, prête.
- **Travail non commité** : cette fiche, sa ligne d'index et la mise à jour
  de l'intention.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
