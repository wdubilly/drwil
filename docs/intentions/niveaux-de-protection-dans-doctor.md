# Intention : `doctor` dit le niveau de protection réel d'un projet

**Statut** : proposée le 2026-10-22 — revue externe du dépôt, constat vérifié
dans le code ;
cadrée le 2026-10-23 dans `docs/projects/niveau-de-protection.md` (les deux questions sont tranchées).

## Besoin

Un projet qui adopte drwil croit avoir une barrière de périmètre, alors
qu'elle n'est qu'un avertissement par défaut. Aucune sortie ne le lui dit. Il
faut empêcher qu'on confonde « une règle est écrite », « un contrôle a
tourné », « il a réussi » et « la garantie est tenue ». Les trois derniers
sont déjà séparés : un contrôle non exécuté n'est jamais un succès (QUA-013),
et `verify` rend PASS, FAIL, MANUAL ou ERROR. Le premier ne l'est pas.

## Existant (relevé le 2026-10-22)

- `packages/drwil/src/config.ts` (ligne 233) met `scopeGate` à `"warning"`
  quand le projet ne le règle pas ; ce dépôt est en `"blocking"`.
- `.githooks/scope-gate.test.mjs` (« sévérité : off ne contrôle rien,
  avertissement signale sans bloquer ») confirme ce comportement.
- `packages/drwil/src/doctor.ts` ne lit pas `scopeGate`.
- Les garanties obligatoires (QUA-094, QUA-095) vérifient déjà la forge et la
  protection de branche.

## Proposition

`doctor` affiche un niveau, chacun prouvé par une vérification et jamais
déclaré :

1. diagnostic seul : des règles en avertissement ;
2. gouvernance locale active : hooks branchés, barrière bloquante ;
3. contrôles CI actifs : la CI rejoue les contrôles du hook ;
4. protection de forge vérifiée : branche protégée, contrôles requis, aucun
   contournement administrateur.

Un niveau inférieur à celui qu'exige la politique du projet n'est jamais
présenté comme conforme.

## Questions à trancher

- [décision] La barrière passe-t-elle en `blocking` par défaut, ou reste-t-elle
  en avertissement avec un chemin de durcissement explicite ?
- [décision] Un projet sous garanties obligatoires en barrière d'avertissement
  fait-il échouer `verify`, ou seulement `doctor` ?
