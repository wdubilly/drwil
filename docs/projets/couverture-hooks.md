# Projet : mesurer et garantir la couverture des hooks de gouvernance

**Statut** : cadré le 2026-10-10 — décisions à prendre avant le lot 1.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - package.json
  - package-lock.json
  - .drwil/ia-first.json
  - packages/drwil/package.json
-->

(cadrage : la mesure de couverture et sa déclaration comme contrôle du
projet ; ce dépôt d'abord — QUA-018 (périmètre explicite : dépôt drwil vs
livrable gabarit) : livrer la mesure aux projets équipés est une question
à trancher.)

## 1. Besoin

Priorité 0 pour le demandeur (2026-10-10), qui demandait si la couverture
était à 100 %. Constat du même jour :

- la couverture n'est mesurée que pour `packages/drwil` (c8, seuil
  QUA-004 : 85 % lignes, 60 % branches, 50 % fonctions) : 89,1 % lignes,
  81,6 % branches, 91,4 % fonctions ; points faibles `packages/drwil/bin/drwil.js`
  (64 %) et le module optionnel de création de release (54 %) ;
- **les hooks de gouvernance (`.githooks/*.mjs`) ne sont pas mesurés du
  tout**, alors que ce sont eux qui gouvernent (état, périmètre, cadrage,
  contrats, check-docs) et qu'ils ont leurs propres tests
  (`.githooks/*.test.mjs`, 69 le 2026-10-10).

Intention : mesurer la couverture des hooks, la rendre visible et la
garantir par un seuil bloquant, puis relever les seuils.

## 2. Hors périmètre

- Écrire tous les tests manquants d'un coup : le relèvement se fait par
  lots, sur décision.
- Le mutation testing (`docs/intentions/fabrique-autonome.md`, brique 2) :
  il mesure la qualité des tests, ce chantier leur étendue.

## 3. Contraintes

- La mesure tourne au commit, au push et en CI, comme celle du paquet
  (contrôle déclaré dans `.drwil/ia-first.json`).
- Un seuil ne descend jamais (cliquet) : il part de la mesure réelle.
- Lien avec `docs/projets/adopter-seuil-couverture.md`, dont le lot 3
  (100 % pour le paquet) reste « à la demande ».

## 4. Décisions

- **2026-10-10 — Priorité 0** : mesurer et garantir la couverture des
  hooks de gouvernance. [décision utilisateur]

## Contrats concernés

- **QUA-004** — Seuil de couverture de test : aujourd'hui limité à
  `packages/drwil`.
- **QUA-013** — Contrôle non exécuté n'est pas passé : une mesure absente
  ne vaut pas couverture.

## 5. Points à trancher

- [décision] **Cible** : seuils de départ égaux à la mesure réelle des
  hooks (cliquet, relevés par lots), ou 100 % visé d'emblée ?
- [décision] **QUA-004** : étendre ce contrat aux hooks, ou un contrat à
  part pour les hooks ?
- [décision] **Livrable** : livrer aussi la mesure des hooks aux projets
  équipés (leurs `.githooks/` sont les mêmes), ou ce dépôt seulement ?

## 6. Lots

- **Lot 1 — mesurer** [IA] : c8 sur `.githooks/*.mjs` avec leurs tests,
  contrôle déclaré, seuils selon la décision. Critère de sortie : le
  rapport de couverture des hooks s'affiche au commit et en CI ; une
  baisse sous le seuil fait échouer le contrôle.
- **Lot 2 — relever** [IA] : tests ajoutés sur les zones non couvertes
  les plus risquées (barrière, état, clôture), seuils relevés. Critère de
  sortie : seuils relevés, contrôles verts.

## 7. Reprise

- **Dernier état** (2026-10-10) : fiche cadrée, rien de réalisé.
- **Travail non commité** : la fiche.
- **Prochaine étape** : [décision] trancher les trois points ; puis
  `/drwil-lancer`.
