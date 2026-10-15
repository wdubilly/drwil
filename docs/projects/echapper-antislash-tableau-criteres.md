# Projet : échapper l'antislash dans le tableau des critères

**Statut** : cadré le 2026-10-15 — lot 1 à faire.
**Risque** : MEDIUM
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/src/criteria.ts
  - packages/drwil/test/kit.test.mjs
  - docs/projects/pending.md
  - docs/projects/journal.md
  - docs/projects/echapper-antislash-tableau-criteres.md
-->

## 1. Besoin

CodeQL bloque la PR #82 : l'alerte « Incomplete string escaping or
encoding » (sévérité haute) porte sur `cell` dans
`packages/drwil/src/criteria.ts` : elle échappe `|` sans échapper `\`. Un
critère contenant `\|` casse la colonne du tableau « critère → preuve →
verdict ». La colonne « Preuve » (`c.link`, `c.proof`) n'est pas échappée
du tout : un `|` y casse aussi le tableau. À corriger pour débloquer la
fusion.

## 2. Hors périmètre

Tout autre changement du tableau (format, colonnes, textes) et l'affichage
de son chemin dans la CLI.

## 3. Contraintes

Un seul fichier de code touché, plus son test ; la correction est faite
dans la source du paquet (`packages/drwil/src`), pas dans le gabarit.

## 4. Décisions

- 2026-10-15 : le demandeur valide la correction par échappement de `\`
  avant `|` (« ok go »).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — échapper `\` puis `|`, dans toutes les colonnes** [IA] : `cell`
  remplace d'abord `\` par `\\`, puis `|` par `\|`, et s'applique au texte
  du critère comme à la preuve (lien et nature) ; tests dans
  `packages/drwil/test/kit.test.mjs` avec `\` et `|` dans le critère et dans la preuve.
  Critère de sortie : tests du paquet verts,
  `run-checks` OK, alerte CodeQL levée sur la PR.

## 7. Reprise

- **Dernier état** (2026-10-15) : fiche cadrée, rien codé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] lot 1, au lancement du chantier.
