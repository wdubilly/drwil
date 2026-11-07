# Intention : aligner QUA-196 et la couverture du diff sur les contrôles confiés à la CI

**Statut** : proposée le 2026-11-07 — limite du chantier « un contrôle lent se joue une seule fois, en CI » (journal du 2026-11-07).

## Besoin

- QUA-196 (la recette d'adoption renvoie à la définition de l'e2e sans la recopier) : son texte ne nomme ni la compétence d'adoption ni `runAt: ["ci"]`, que son test éprouve désormais. L'amender est une modification de contrat (oui du demandeur).
- `couverture-diff` est confié à la CI dans `.drwil/ia-first.json`, mais aucun contrat ne le cite : `drwil verify` ne le nomme pas parmi les contrôles en attente de la CI (sa note en cite quatre, `run-checks` cinq).

## Existant (relevé le 2026-11-07)

- Test de QUA-196 dans `packages/drwil/test/kit.test.mjs` : recette et compétence d'adoption proposent `runAt ["ci"]`, renvoient au catalogue sans le recopier.
- `.drwil/ia-first.json` : `couverture-diff` en `runAt: ["ci"]` ; note de `drwil verify` : quatre contrôles en attente (`couverture-tests`, `couverture-hooks`, `couverture-claude`, `tarball`).

## Questions à trancher

- [décision] Amender le texte de QUA-196 ?
- [décision] Rattacher `couverture-diff` à un contrat (QUA-004 ou celui de la couverture du diff), pour que `verify` le compte en attente ?
