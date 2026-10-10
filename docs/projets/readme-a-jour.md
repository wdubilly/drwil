# Projet : des README à jour du cycle de gouvernance

**Statut** : cadré le 2026-10-10 — décisions à prendre avant le lot 1.
**Risque** : MEDIUM

<!-- cadrage
fichiers:
  - README.md
  - packages/drwil/README.md
-->

(cadrage : le README de la racine (vitrine GitHub) et celui du paquet
(page npm) — QUA-018 (périmètre explicite : dépôt drwil vs livrable
gabarit) : le second est le livrable.)

## 1. Besoin

Le demandeur juge les README obsolètes après les chantiers du 2026-10-10.
Constat le même jour : `README.md` (986 lignes) et
`packages/drwil/README.md` (535 lignes), différents l'un de l'autre, ne
mentionnent aucun des mécanismes livrés ce jour-là ni la veille :

- le cycle de gouvernance (activités CADRAGE → REALISATION → PREUVES →
  VERIFY → CLOTURE, `node .githooks/etat.mjs`, barrière de périmètre,
  rappel court de l'état) ;
- le lancement par sondage (`/drwil-lancer`), l'ordre proposé (fiches
  prêtes, priorité) et la fusion autorisée au lancement ;
- le marqueur `**Statut** : terminé le …`, la condensation dans le journal ;
- la protection de la forge (ruleset, CODEOWNERS, ruleset versionné).

Ils restent centrés sur les contrats, `verify` et l'attestation, qui sont
toujours exacts.

## 2. Hors périmètre

- La traduction intégrale du livrable
  (`docs/intentions/livrable-full-english.md`) : les README sont déjà en
  anglais.
- La doc détaillée du gabarit (`docs/ia-first.md` du gabarit), déjà à jour.

## 3. Contraintes

- Une information, une source : le détail reste dans `docs/ia-first.md`
  du gabarit ; les README résument et renvoient.
- Ne rien affirmer qui ne soit vérifiable dans le code (QUA-011, doc
  jamais fausse).

## 4. Décisions

- **2026-10-10 — Revoir les README** : demandé par le demandeur.
  [décision utilisateur]

## Contrats concernés

- **QUA-011** — Doc jamais fausse : un README qui omet le cycle réel
  trompe le lecteur sur ce que fait drwil.

## 5. Points à trancher

- [décision] **Deux README ou une source** : garder deux textes (vitrine
  GitHub et page npm) ou faire de l'un un résumé de l'autre, voire un seul
  fichier ?
- [décision] **Profondeur** : une section « Governance workflow » courte
  (le cycle en un schéma, les deux gestes humains, renvois vers la doc) ou
  une réécriture plus large ?

## 6. Lots

- **Lot 1 — inventaire et réécriture** [IA] : liste des écarts entre les
  README et le code ; section sur le cycle de gouvernance selon les
  décisions. Critère de sortie : chaque mécanisme cité au besoin apparaît
  dans le ou les README, avec renvoi vers la doc ; check-docs vert.

## 7. Reprise

- **Dernier état** (2026-10-10) : fiche cadrée, rien de réalisé.
- **Travail non commité** : la fiche.
- **Prochaine étape** : [décision] trancher les deux points ; puis
  `/drwil-lancer`.
