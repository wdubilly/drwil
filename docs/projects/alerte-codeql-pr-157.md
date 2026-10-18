# Projet : lever l'alerte CodeQL de la PR 157 (correction intercalée)

**Statut** : cadré le 2026-10-18, validé par le demandeur (« Ok go »).
**Risque** : LOW
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/test/kit.test.mjs
-->

(cadrage : le seul test du chantier « date gardée et feu vert de
publication » que l'analyse CodeQL refuse.)

## 1. Besoin

La PR 157 (date gardée et feu vert de publication, 0.6.5, 1 sur 4) est
close côté gouvernance mais ne fusionne pas : CodeQL lève une alerte
`js/incomplete-sanitization` (échappement incomplet, sévérité haute) sur
`packages/drwil/test/kit.test.mjs`, où le test QUA-047 insère une ligne
par `replace("\n", …)`, qui ne remplace volontairement que la première
occurrence. L'alerte est sans danger (code de test) mais bloque la fusion ;
l'ignorer dans GitHub serait un contournement (QUA-019, pas de
contournement).

## Critères d'acceptation

- Le test QUA-047 insère sa ligne sans `replace` sur une seule
  occurrence, garde le même comportement et passe ; plus aucune alerte
  CodeQL sur la PR 157 — `QUA-047`

## 2. Hors périmètre

- Le dépassement du budget de temps des contrôles au commit sous Windows
  (1 783 ms pour 1 500 ms, une fois) : relance du job ; s'il revient,
  une intention.
- Toute autre modification du chantier clos.

## 3. Lots

- **Lot 1** : réécrire l'insertion de ligne du test QUA-047 (découpage
  par lignes puis assemblage), relancer le test et les contrôles.

## 4. Décisions

- **2026-10-18 — Correction sur la branche de la PR 157** (demandeur) :
  la PR ne peut fusionner sans elle ; sa fusion automatique est
  désactivée le temps de la correction, puis reprogrammée.

## 5. Reprise

- **Dernier état** (2026-10-18) : cadré, rien de construit ; fusion
  automatique de la PR 157 désactivée.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
