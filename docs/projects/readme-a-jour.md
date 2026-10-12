# Projet : des README à jour du cycle de gouvernance

**Statut** : recadré le 2026-10-12 — décisions prises, lot 1 à lancer.
**Risque** : MEDIUM

<!-- scope
files:
  - README.md
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
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
  VERIFY → CLOTURE, `node .githooks/state.mjs`, barrière de périmètre,
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
- **2026-10-10 — Le README du paquet résume celui de la racine** (point 5) :
  la racine reste la référence complète ; `packages/drwil/README.md`
  devient un résumé court (installation, commandes, cycle) qui renvoie
  vers elle. [décision utilisateur]
- **2026-10-10 — Section courte** (point 5) : une section « Governance
  workflow » (le cycle en un schéma, les gestes humains — lancer, fusion
  autorisée —, la protection de la forge), avec renvois vers la doc du
  gabarit ; pas de réécriture d'ensemble. [décision utilisateur]

- **2026-10-12 — Recadrage** (demandeur) : les deux README, pas seulement
  le paquet ; l'accent est mis sur le README de l'outil : le gain (ce que
  l'outil apporte, pour qui, face à quel problème), puis installation,
  concept, commandes et cycle ; plus qu'une simple section sur le cycle.
  Le gain n'affirme que ce qui est prouvé (QUA-011, doc jamais fausse) :
  tant que le mini-banc avec / sans drwil n'a pas produit de chiffres,
  aucun chiffre de productivité, seulement les garanties vérifiables
  (périmètre tenu, preuves, attestation humaine) ; la
  prochaine release (0.5.1 ou 0.6.0, à fixer à la release) l'embarque,
  note de version comprise. Le report « après la vague 7 » du 2026-10-11
  est levé : le cycle de base (activités, sondage, fusion autorisée) est
  stable ; la forge et la fabrique seront ajoutées quand elles existeront.
  Vocabulaire à jour : activités SCOPING → BUILD → EVIDENCE → VERIFY →
  CLOSING, `drwil init` (plus d'`apply`), `/drwil-start`. Les restes de
  français de `README.md` (titres SEC-007, QUA-011) sont traduits.
  [décision utilisateur]

## Contrats concernés

- **QUA-011** — Doc jamais fausse : un README qui omet le cycle réel
  trompe le lecteur sur ce que fait drwil.

## 5. Points à trancher

- ~~Les deux points~~ — tranchés le 2026-10-10 (voir « Décisions »).

## 6. Increments

- **Lot 1 — inventaire et réécriture** [IA] : liste des écarts entre les
  README et le code ; gain, installation, concept, commandes et
  cycle de gouvernance à jour dans les deux README ; français résiduel traduit ;
  note de version si le paquet change. Critère de sortie : chaque mécanisme cité au besoin apparaît
  dans le ou les README, avec renvoi vers la doc ; check-docs vert.

## 7. Reprise

- **Dernier état** (2026-10-12) : fiche recadrée, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] `/drwil-start`.
