# Intention : l'attestation de la durée du job `checks` ne tombe plus à chaque contrôle ajouté

**Statut** : proposée le 2026-10-25 — limite constatée à la clôture du chantier
« un hook modifié se déclare avant la clôture, et le retour en SCOPING attend
la CI » (journal du 2026-10-25).

## Besoin

QUA-122 (le job `checks` est nettement plus court, hooks modifiés comme hooks
inchangés) est un contrat attesté par l'humain dont le champ « Couvre » inclut
`.drwil/ia-first.json`. Tout chantier qui crée un contrat y ajoute son contrôle
`tests-qua-<id>` : l'attestation tombe, `drwil verify` passe en MANUAL et le
chantier attend un geste humain sans rapport avec ce qu'il change. Sur ce
chantier, l'ajout de `tests-qua-137` et `tests-qua-138` a demandé de
réattester QUA-122 ; c'est au moins la troisième réattestation pour la même
cause (historique de `.drwil/evidence/attestations/`).

## Existant (relevé le 2026-10-25)

- « Couvre » de QUA-122 : `.github/workflows/ia-first.yml`, `.drwil/ia-first.json`.
- `docs/intentions/suivi-ci-et-contexte.md` pose déjà la question de faire de
  la durée de CI un indicateur suivi plutôt qu'un contrat attesté.

## Questions à trancher

- [décision] Restreindre « Couvre » de QUA-122 au workflow
  `.github/workflows/ia-first.yml`, ou aux seuls réglages de
  `.drwil/ia-first.json` qui jouent sur la durée de la CI (modifier un
  contrat existant : décision du demandeur), ou régler la question avec
  l'indicateur de `docs/intentions/suivi-ci-et-contexte.md` ?
