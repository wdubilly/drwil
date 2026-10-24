# Intention : compléter la suite des contournements testés

**Statut** : proposée le 2026-10-22 — revue externe du dépôt ; inventaire
de l'existant fait le même jour ;
cadrée le 2026-10-23, réalisée le 2026-10-24 (journal du 2026-10-24, « Les
contournements restants fermés ou assumés ») : les trois questions sont
tranchées ; restent ici le clone superficiel et l'agent qui élargit son
cadrage.

## Besoin

Démontrer que les règles existantes résistent à une erreur ou à une tentative
de contournement avant d'en ajouter de nouvelles. Chaque scénario dit le
résultat qu'il exige : refus, échec en CI, ou état explicitement « non
exécuté ». Une alerte ne compte jamais comme un blocage.

## Existant (inventaire du 2026-10-22)

Couverts, avec le résultat exigé :

- `--no-verify`, commit sans hooks, `core.hooksPath` détourné : repris au push
  et en CI (`packages/drwil/test/cycle.test.mjs`, « contournements : un commit
  passé avec --no-verify ou sans hooks… »).
- État local falsifié : le cadrage est rejoué sur la branche (même fichier).
- Commit sans trailer `Drwil-Brief` : refusé en CI
  (`.githooks/scope-gate.test.mjs`) ; vécu avec la PR #199.
- Cadrage et code dans le même commit : refusé au commit (même fichier).
- Base de comparaison absente : « non exécuté » (même fichier).
- Travail ou push direct sur la branche principale (QUA-017) :
  `packages/drwil/test/kit.test.mjs`, `.githooks/engine.test.mjs`.
- Attestation forgée ou périmée : `packages/drwil/test/kit.test.mjs`
  (« attest : aucun contournement… ») et `packages/drwil/test/cycle.test.mjs` (QUA-032, QUA-081).

## Trous relevés

Traités le 2026-10-24 (QUA-113, la CI rejoue les contrôles avec les hooks de
la branche principale ; QUA-114, la garde shell refuse le saut des hooks ;
QUA-115, `bypass_actors` vérifié avec le jeton de l'humain) : hooks modifiés
dans la PR, `core.hooksPath` en local, `bypass_actors`. Leurs limites ont
leurs propres intentions, citées par le journal. Restent :

- **Clone superficiel** : non testé. La CI fait `fetch-depth: 0`, dans ce
  dépôt comme dans le gabarit.
- **Un agent qui élargit lui-même son cadrage puis code** : voulu, seulement
  visible en relecture.

## Questions à trancher

- [décision] Tester un clone superficiel (la CI le refuse-t-elle en « non
  exécuté »), ou assumer `fetch-depth: 0` comme seule défense ?
- [décision] Un élargissement de cadrage par l'agent doit-il être signalé à
  l'humain au-delà de la relecture ?
