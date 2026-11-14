# Projet : la reprise d'un détour ne réécrit jamais une branche déjà poussée

**Statut** : cadré le 2026-11-14.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : note du 2026-11-13 de `docs/intentions/notes.md` (« detour.mjs resume impose un rebase… »), promue en
cette fiche et retirée des notes.

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/detour.mjs
  - packages/drwil/templates/common/base/.githooks/detour-texts.mjs
  - packages/drwil/templates/common/base/.githooks/detour-resume.mjs
  - .githooks/detour.mjs
  - .githooks/detour-texts.mjs
  - .githooks/detour-resume.mjs
  - .githooks/detour.test.mjs
  - .githooks/detour-resume.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/corriger-un-defaut.md
  - docs/recipes/corriger-un-defaut.md
  - packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md
  - docs/ia-first/8-conduct-rules.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

`node .githooks/detour.mjs resume` (reprise après un détour, QUA-050) revient sur la branche du chantier et la
**rebase** sur la branche principale corrigée ; si la branche était déjà poussée, il conseille
`git push --force-with-lease`. Or la règle interdit de réécrire un historique poussé (QUA-116, réouverture sans
réécriture ni push forcé ; section 8 des consignes). Le cas s'est produit le 2026-11-13 sur le chantier « La ligne
« Unreleased » du changelog s'écrit en fin de BUILD » (`node .githooks/glossary.mjs --journal
unreleased-en-fin-de-build`) : chantier rouvert, détour `ci-dans-chemin-temporaire` (PR #424) fusionné, puis
`resume` a voulu rebaser la branche déjà poussée avec sa PR #423 ; il a refusé au premier conflit (le journal : deux
entrées ajoutées en fin de fichier, l'une sur chaque branche) et aurait de toute façon conseillé le push forcé.
Contournement manuel : rebase local, nouvelle branche distante `workstream/unreleased-en-fin-de-build-2` et PR #425
remplaçant la #423. La reprise doit se faire sans réécriture, sans geste manuel et sans nouvelle PR.

## Critères d'acceptation

- Sur une branche de chantier qui a un amont (déjà poussée), `resume` fusionne la branche principale corrigée dans
  la branche du chantier (commit de fusion, hooks du dépôt joués), ne rebase jamais et ne conseille jamais de push
  forcé ; sa sortie dit « fusionnée » ; sur une branche sans amont, le rebase d'aujourd'hui est gardé (trailer
  `Drwil-Brief` de chaque commit rejoué compris) — `QUA-050`
- Une branche de chantier qui contient déjà la branche principale (fusion faite à la main) est reprise sans rien
  rejouer ni fusionner : travail restauré, état en BUILD sur la fiche d'origine — `QUA-050`
- Un conflit de reprise limité aux fichiers d'ajout en fin de fichier connus (`docs/projects/journal.md`, ou le
  journal déclaré du projet) se résout seul en gardant les deux entrées, celle de la branche principale d'abord puis
  celle du chantier, sans en perdre ni en dupliquer une ; tout autre conflit, ou un conflit du journal qui n'est pas
  un pur ajout en fin de fichier des deux côtés, est refusé comme aujourd'hui : fusion (ou rebase) annulée, état
  inchangé, travail mis de côté intact, branche à son commit d'avant — contrat à créer
- Toute étape qui échoue (fusion, rebase, restauration) laisse l'état, la branche et la mise de côté inchangés ; un
  appel git qui échoue refuse, jamais un succès (QUA-013) — `QUA-050`

## Contrats modifiés

- `QUA-050` — ancien critère : « `node .githooks/detour.mjs resume` n'accepte qu'un arbre propre et une PR fusionnée
  (fiche retirée, journal qui cite la branche) : il revient sur la branche du chantier, la rebase sur la branche
  principale corrigée (un commit rejoué garde son trailer `Drwil-Brief`), restaure le travail et remet l'état en BUILD
  sur la fiche d'origine » (et, dans son test, « branche poussée : push forcé indiqué ») — raison : le rebase d'une
  branche déjà poussée oblige à réécrire un historique publié, que la règle interdit (« le force est interdit,
  résoudre proprement ») ; une branche poussée reprend par fusion, une branche déjà à jour sans rien rejouer
  (validé le 2026-11-13)
- `.githooks/detour.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/detour-texts.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)

## 2. Hors périmètre

- `detour.mjs open`, `allow` et les règles du jeu d'un détour (`.githooks/detour-rules.mjs`) : inchangés.
- La réouverture (QUA-116) et la fusion automatique (`merge-auto`) : inchangées.
- Une résolution générale des conflits (`git merge-file --union`, pilote de fusion `.gitattributes`) au-delà des
  fichiers d'ajout en fin de fichier connus : écartée, tout autre conflit reste tranché par un humain.
- Pousser : `resume` ne pousse toujours rien.
- Réparer l'historique de la PR #423 ou de la branche `workstream/unreleased-en-fin-de-build-2` : déjà clos.

## 3. Contraintes

- Jamais de `--no-verify`, ni pour le commit de fusion ni ailleurs (QUA-019) : la barrière de périmètre juge le
  commit de fusion sur sa seule résolution (QUA-111) ; le journal résolu en garde les deux entrées.
- Amont lu par git (`@{u}`) ; amont illisible ou ambigu : traité comme poussé (fusion), jamais comme non poussé (pas
  de réécriture dans le doute).
- `.githooks/detour.mjs` compte 180 lignes (plafond 200) : la reprise passe dans .githooks/detour-resume.mjs (neuf,
  gabarit et copie), ré-exporté par `.githooks/detour.mjs`, sans changer `open` ni `allow` ; carte d'architecture et
  `docs/projects/kit-mechanics.md` mis à jour.
- Gabarit d'abord, puis `npm run installer-depot` (QUA-018) ; le contrôle `miroirs-gabarit` sans écart.
- Tests sur de vrais dépôts git temporaires, avec un dépôt distant et le vrai hook `prepare-commit-msg`, comme les
  tests actuels de QUA-050 ; chaque nouveau test en échec contre le code d'avant.
- La ligne « Unreleased » de `packages/drwil/CHANGELOG.md` s'écrit dans le dernier lot.

## 4. Décisions

- D1 (2026-11-13, demandeur : « le force est interdit, résoudre proprement ») : branche du chantier qui a déjà un
  amont → `resume` fusionne la branche principale (merge), jamais de rebase ni de conseil de push forcé ; branche
  jamais poussée → rebase comme aujourd'hui.
- D2 (2026-11-13, demandeur) : un conflit limité aux fichiers d'ajout en fin de fichier connus
  (`docs/projects/journal.md`) se résout en gardant les deux entrées, celle de la branche principale d'abord ; tout
  autre conflit → refus comme aujourd'hui (état inchangé, travail mis de côté intact, fusion annulée).
- D3 (2026-11-13, demandeur) : `resume` accepte une branche qui contient déjà la branche principale (fusion faite à
  la main) sans rien rejouer.
- D4 (2026-11-14, demandeur) : P0, version 0.11.2, deuxième de la file après « attestations qui tombent pour leur
  objet » (OPT-4).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — reprise sans réécriture** [IA] : découpe de la reprise dans .githooks/detour-resume.mjs (neuf) sans changer de
  comportement, puis fusion sur une branche poussée (D1), branche déjà à jour reprise telle quelle (D3), conseil de
  push forcé retiré ; puce QUA-050 au registre. Critère de sortie : tests de QUA-050 verts, nouveaux tests en échec
  contre le code d'avant.
- **Lot 2 — conflit du journal** [IA] : résolution des fichiers d'ajout en fin de fichier connus (D2), refus de tout
  autre conflit ; contrat créé et son contrôle déclaré dans `.drwil/ia-first.json` ; recette, consignes, carte,
  mécanique du kit, changelog. Critère de sortie : `node .githooks/run-checks.mjs` sans échec,
  `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-14) : lot 1 commité (242eef9f). La reprise est dans `.githooks/detour-resume.mjs`
  (gabarit et copie, ré-exporté par `.githooks/detour.mjs`). Une branche avec un amont, ou dont l'amont est illisible,
  reçoit une fusion (`catchUp`, `pushed`) ; une branche sans amont est rebasée ; une branche qui contient déjà la
  branche principale n'est ni rebasée ni fusionnée. Si une étape échoue, `undo` remet la branche à son commit
  d'avant et l'état tel qu'il était, sans toucher la mise de côté. Tests : `.githooks/detour-resume.test.mjs`
  (5 tests QUA-050, en échec contre le code d'avant). QUA-050 est à jour au registre, et `tests-qua-050` joue le
  nouveau fichier. Le gabarit de `docs/projects/kit-mechanics.md` a été ajouté au bloc scope par un commit de
  cadrage séparé (6e79065a) : limite répondue « Traiter maintenant » ; le module est livré et check-docs d'un projet
  installé le refusait.
- **Prochaine étape** : lot 2, le conflit du journal (D2). Dans `catchUp`, quand la fusion ou le rebase échoue, ne
  résoudre que `docs/projects/journal.md` (ou le journal déclaré), et seulement si ce sont deux ajouts en fin de
  fichier : garder l'entrée de la branche principale d'abord, puis celle du chantier ; refuser tout autre conflit.
  Créer le contrat et déclarer son contrôle dans `.drwil/ia-first.json`, puis écrire son ID à la fin du critère
  « contrat à créer ». Mettre à jour la recette `docs/recipes/corriger-un-defaut.md`, la section 8 des consignes (gabarit et
  copies) et le changelog (« Unreleased »). Critère de sortie : `run-checks` sans échec et `drwil verify --agent` en
  `GOVERNANCE: PASS`.
