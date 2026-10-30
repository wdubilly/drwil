# Intention : alléger la release, puis outiller ce qui reste

**Statut** : cadrée le 2026-10-30 en `docs/projects/journal.md` (patch direct, une PR, réglage `release.mode`, `solo` par défaut ; fiche du feu vert gardée) ; les deux petites limites (citation de `.githooks/recette-note.mjs`, texte de QUA-048) traitées le 2026-10-30 ; proposée le 2026-10-26 — rangement du backlog : découpage de `petits-defauts` par thème (décision du demandeur du 2026-10-26) ; chaque partie reprend l'une des intentions d'origine, avec son statut d'origine.

## Besoin

La release coûte trop de gestes pour un patch, et deux écarts de sa documentation ont été relevés. Décidé par le demandeur le 2026-10-26 : alléger d'abord, puis outiller ce qui reste ; la fiche `docs/projects/release-feu-vert-et-squash.md` attend les réponses de cette intention (gardée, réduite ou abandonnée).

### alléger le parcours de release (ex-note du 2026-10-21)

- 2026-10-21 — Release trop lourde (3 h pour la 0.6.9 : PR de préparation, candidate, verdict, promotion, PR de clôture, CI) : alléger — release directe sans candidate pour un patch, une seule PR au lieu de clôture + note de recette, script qui enchaîne les étapes en gardant les oui humains ; et un réglage équipe / développeur solo qui choisit le niveau de garde (candidate et verdict seulement en équipe)

### citer le module de note de recette dans la fiche des mécaniques livrée et le README du module (ex-« recette-note-dans-la-fiche-des-mecaniques »)

Statut d'origine : proposée le 2026-10-21 — limite non traitée de la clôture « note de recette par version » (journal du 2026-10-21).

`.githooks/recette-note.mjs`, livré avec le module de release, n'est cité ni par la
fiche des mécaniques livrée au kit (le périmètre d'un projet qui
active le module ne le couvre pas, son premier commit est refusé) ni par le
README du module. Le chantier ne pouvait pas les toucher : hors de son cadrage.

### aligner le texte de QUA-048 sur la reconnaissance par squash (ex-« qua-048-aligne-sur-squash »)

Statut d'origine : proposée le 2026-10-19 — limite du chantier « les branches fusionnées par squash reconnues » (journal du 2026-10-19, 0.6.6, 2 sur 4).

QUA-048 (une clôture en un geste) dit encore que les branches fusionnées
sont supprimées au lancement par `git branch -d`. Depuis QUA-058 (une
branche dont la PR est fusionnée sur GitHub est reconnue fusionnée, squash
compris), une branche dont la fusion par squash est prouvée par `gh` est
supprimée par `git branch -D`. Les deux contrats ne se contredisent pas
(QUA-058 précise le cas), mais le texte de QUA-048 n'est plus complet.

## Existant

Relevé dans chaque intention d'origine, à sa date ; non revérifié le 2026-10-26.

### alléger le parcours de release (ex-note du 2026-10-21)

- Parcours actuel (`docs/recipes/create-a-release.md`) : PR de préparation, candidate, verdict humain, promotion, PR de clôture et note de recette.
- `docs/projects/release-feu-vert-et-squash.md` (cadrée le 2026-10-26) outille ce parcours avec candidate : feu vert enregistré par l'outil, recette qui signale un squash.

### citer le module de note de recette dans la fiche des mécaniques livrée et le README du module (ex-« recette-note-dans-la-fiche-des-mecaniques »)

**Existant (relevé le 2026-10-21)** :

- `docs/projects/kit-mechanics.md` cite `.githooks/recette-note.mjs` (ajouté à
  la clôture) ; sa copie livrée
  `packages/drwil/templates/common/base/docs/projects/kit-mechanics.md` cite
  chaque script du module sauf lui.
- `packages/drwil/templates/common/optional/create-release/README.md` liste
  les scripts à copier sans `.githooks/recette-note.mjs` : un projet qui copie moins que
  la liste obtient une erreur d'import au lancement de `.githooks/create-release.mjs`.
- Le test du kit (`packages/drwil/test/kit.test.mjs`) ajoute la ligne dans le
  projet de test pour contourner le manque.

### aligner le texte de QUA-048 sur la reconnaissance par squash (ex-« qua-048-aligne-sur-squash »)

**Existant (vérifié le 2026-10-19)** :

- `docs/contracts.md`, QUA-048 : « supprimées (`git branch -d`) — jamais
  la branche principale, la courante, une branche encore au sommet de la
  principale ni une branche non fusionnée ».
- Modifier un contrat existant demande sa déclaration dans la section
  « Contrats modifiés » d'une fiche, validée par le demandeur (QUA-023,
  régression ou évolution d'un contrat) : le chantier ne l'a pas fait.

## Questions à trancher

### alléger le parcours de release (ex-note du 2026-10-21)

- [décision] Un patch se publie-t-il directement, sans candidate ni verdict ?
- [décision] Une seule PR au lieu de la préparation, de la clôture et de la note de recette ?
- [décision] Un réglage équipe / solo qui choisit le niveau de garde (candidate et verdict seulement en équipe) ?
- [décision] Selon ces réponses : la fiche `docs/projects/release-feu-vert-et-squash.md` est-elle gardée, réduite ou abandonnée ?

### citer le module de note de recette dans la fiche des mécaniques livrée et le README du module (ex-« recette-note-dans-la-fiche-des-mecaniques »)

- Ajouter les deux citations dans un chantier court (fiche à cadrer), puis
  retirer le contournement du test du kit.

### aligner le texte de QUA-048 sur la reconnaissance par squash (ex-« qua-048-aligne-sur-squash »)

- [décision] Réécrire la phrase de QUA-048 en renvoyant à QUA-058 et
  QUA-059 (évolution déclarée dans une fiche), ou la laisser telle quelle,
  QUA-058 faisant foi pour le squash ?
