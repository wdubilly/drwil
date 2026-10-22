# Intention : compléter la suite des contournements testés

**Statut** : proposée le 2026-10-22 — revue externe du dépôt ; inventaire
de l'existant fait le même jour.

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

- **Hooks modifiés dans la PR elle-même** : la CI exécute les scripts de la
  branche contrôlée, donc une PR qui affaiblit `.githooks/run-checks.mjs` se
  valide elle-même. Dans ce dépôt, seule la relecture d'un code owner la
  protège ; un projet adopté n'a pas de CODEOWNERS
  (`docs/intentions/forge-dans-le-livrable.md`).
- **`bypass_actors` non comparé en CI** : `.github/scripts/verifier-ruleset.mjs`
  ne le compare que s'il est lu des deux côtés, et le jeton de la CI n'est pas
  administrateur.
- **Clone superficiel** : non testé. La CI fait `fetch-depth: 0`, dans ce
  dépôt comme dans le gabarit.
- **Un agent qui élargit lui-même son cadrage puis code** : voulu, seulement
  visible en relecture.
- **En local, `git -c core.hooksPath=…`** : rien ne l'empêche ; la garde shell
  (`.claude/hooks/bash-guard.mjs`) ne le voit pas. La CI le rattrape.

## Questions à trancher

- [décision] Pour les hooks modifiés : exécuter en CI les contrôles de la
  branche principale plutôt que ceux de la branche, exiger une relecture
  humaine sur `.githooks/`, ou les deux ?
- [décision] Vérifier `bypass_actors` avec un jeton administrateur dédié, ou
  l'assumer comme une limite documentée ?
- [décision] La garde shell demande-t-elle l'accord sur `--no-verify` et
  `core.hooksPath`, au risque de multiplier les demandes ?
