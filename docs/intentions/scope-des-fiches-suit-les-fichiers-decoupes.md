# Intention : le scope d'une fiche suit les fichiers découpés et la carte d'architecture

**Statut** : cadrée le 2026-11-13 — `docs/projects/perimetre-prevu-au-cadrage.md`.
**Revu le 2026-10-28** : cadrée le jour même en `docs/projects/journal.md` (piste retenue : alerter au cadrage et rappeler dans le modèle de fiche, barrière inchangée). Reste vivante : l'admission automatique des fichiers dérivés, à reprendre si les arrêts persistent.
**Revu le 2026-11-13** : les arrêts persistent, la condition de reprise est remplie (OPT-6 du scan de valeur du
2026-11-12, `docs/decouverte-valeur.md`) ; rangée en 0.11.2 sur décision du demandeur, élargie au périmètre prévu au
cadrage (section « Relance du 2026-11-13 »).

## Besoin

Deux chantiers de suite se sont arrêtés, plusieurs fois, sur des fichiers
absents du bloc scope de leur fiche : `packages/drwil/src/config-write.ts` (extrait de
`packages/drwil/src/config.ts` par le plafond de 200 lignes alors que la fiche visait encore
l'ancien fichier), `docs/architecture.md` (QUA-040 : tout fichier de code neuf
y est cité), `docs/projects/kit-mechanics.md` et sa copie gabarit (chaque hook
livré y est listé), et un dossier cité sans joker. Chaque arrêt coûte une
décision humaine et une relance de sous-agent.

## Existant (relevé le 2026-10-28)

- Les fiches cadrées avant la 0.10.0 visent des fichiers qui ont été scindés
  depuis ; les restantes n'ont pas été relues.
- Le modèle de fiche (`docs/projects/model-brief.md`) ne rappelle ni la carte
  d'architecture ni `docs/projects/kit-mechanics.md` pour un fichier de code ou un hook neuf.
- La barrière de périmètre ne lit un chemin de dossier que comme ce chemin
  exact, pas comme un dossier.
- Relecture des six fiches cadrées restantes (2026-10-28) : aucun chemin de
  scope introuvable, aucun dossier sans joker, aucun fichier neuf prévu ; mais
  plusieurs fichiers de leur scope sont à la limite du plafond de 200 lignes :
  `packages/drwil/src/criteria.ts` (200), `.githooks/base-checks.mjs` (200),
  `packages/drwil/src/verify.ts` (199), `packages/drwil/src/evidence.ts` (190),
  `packages/drwil/src/closure.ts` (184). Toute modification qui les agrandit
  force une découpe, donc un fichier neuf absent du scope : le même arrêt est
  à prévoir.

## Relance du 2026-11-13 (OPT-6)

- 72 commits d'élargissement du périmètre depuis le 2026-10-22 ; chaque limite coûte un sondage, un commit et une
  reprise.
- Ce qui manque au scope le plus souvent : les tests qui importent un module cité ou figent ses messages, et les
  fichiers du `**Périmètre**` des contrats que la fiche touche. Les deux se calculent au cadrage.
- Briques existantes : `readBlock` et `withMirrors` (`.githooks/scope.mjs`), le réglage `scopeMirrors`.
- Lien : `docs/intentions/limites-classees-par-lien.md` compte les élargissements à la clôture ; celle-ci les évite au
  cadrage.

## Questions à trancher

- [décision] Au cadrage, proposer (ou ajouter d'office) au bloc scope les tests qui importent un module cité et les
  fichiers du `**Périmètre**` des contrats touchés : avertissement de `check-docs`, ou ajout par un outil sur le oui
  du demandeur ?

- [décision] Relire maintenant le scope des fiches cadrées restantes pour qu'il
  suive les fichiers découpés, et faire rappeler par le modèle de fiche la
  carte d'architecture et `docs/projects/kit-mechanics.md` ?
- [décision] Aller à la cause (demande du 2026-10-28) : un fichier découpé ou
  neuf ne devrait pas demander à chaque fois un détour ou un élargissement
  humain. Pistes : (a) la barrière lit un chemin de dossier comme un dossier
  (joker implicite) ; (b) les fichiers dérivés d'un fichier du scope (sa
  découpe, sa carte d'architecture, `docs/projects/kit-mechanics.md`, la copie gabarit)
  sont admis sans élargissement, tant qu'ils ne sont pas des règles ; (c) un
  fichier découpé hérite du scope de son ancêtre, en gardant le plafond de
  200 lignes. Quelle piste, ou quelle combinaison, sans rouvrir le
  contournement du cadrage (QUA-019, auto-élargissement) ?
