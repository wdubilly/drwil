# Intention : donner à l'agent toutes les voies possibles quand il se croit bloqué

**Statut** : proposée le 2026-11-23 — demande du demandeur, relevée pendant le chantier « acceleration-des-controles ».

## Besoin

Quand un agent se croit bloqué, un contrôle qui échoue, une attestation humaine attendue, une transition réservée, un périmètre refusé, il doit recevoir d'un coup toutes les voies qui s'offrent à lui, au lieu de s'arrêter sur la première ou de proposer une seule issue. Il choisit ou les soumet à l'humain, jamais en contournant le contrôle (QUA-019, pas de contournement d'un contrôle).

## Existant (relevé le 2026-11-23)

- `node packages/drwil/bin/drwil.js verify --agent` finit par « Human attestation required » et une seule consigne (`drwil attest-poll`, puis le terminal en repli) ; il ne dit pas les autres issues : faire d'abord l'essai demandé par le contrat, retirer ou relier un critère mal étiqueté, élargir le cadre par le sondage des limites.
- Les barrières (périmètre, clôture, détour) refusent avec leur propre message, chacune pour son cas ; aucune ne liste les autres voies licites.
- Constat du chantier : à la fin de `verify`, l'agent a rendu cinq blocages dans un ordre qui ne disait pas lesquels il pouvait lever seul, lesquels demandaient une décision humaine, et lesquels demandaient un essai réel.

## Questions à trancher

- [décision] Une seule sortie standard (un bloc « voies possibles » à la fin de chaque refus) ou un outil que l'agent lance quand il se croit bloqué ?
- [IA] Par type de blocage, quelles voies : corriger le code, relier ou rectifier un critère, noter une intention, ouvrir un détour, soumettre un sondage à l'humain ; lesquelles sont à l'agent, lesquelles à l'humain ?
- [IA] Comment garantir que la liste ne propose jamais un contournement (`--no-verify`, contrôle désactivé) ?
