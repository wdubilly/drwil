# Intention : une attestation ne doit pas tomber quand un contrôle change de forme sans changer d'effet

**Statut** : proposée le 2026-10-24 — limite du chantier « accélérer la CI sans
perte de qualité » (journal du 2026-10-24).

## Besoin

L'ajout de champs de compilation et de parallélisme (`build`, `needsBuild`) à
une centaine de contrôles de `.drwil/ia-first.json` a périmé six attestations
humaines (QUA-013, QUA-015, QUA-064, QUA-066, QUA-067, QUA-092), alors que
l'effet des contrôles n'avait pas changé. L'empreinte de la preuve devrait se
définir sur l'effet du contrôle (commande normalisée, tests visés) plutôt que
sur sa déclaration complète.

## Existant (relevé le 2026-10-24)

- L'empreinte d'une attestation couvre la déclaration complète des contrôles de
  `.drwil/ia-first.json` ; l'humain a dû ré-attester les six contrats.

## Questions à trancher

- [décision] Quelle empreinte : commande normalisée et tests visés de chaque
  contrôle cité par le contrat, sans les champs d'exécution ?
- [décision] Comment éviter qu'un contrôle dont l'effet change vraiment ne
  conserve son attestation (QUA-013, un contrôle non exécuté n'est pas passé) ?
