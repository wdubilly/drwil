# Intention : déclarer ce que couvrent les contrats attestés du dépôt

**Statut** : proposée le 2026-10-21 — limite du chantier « une attestation tombe quand ce qu'elle couvre change ».

## Besoin

Le champ `**Covers**` (`**Couvre**`) existe, mais aucun contrat attesté de ce
dépôt n'en déclare : `drwil verify` et `drwil doctor` les signalent, et leur
attestation ne tombera pas quand le code qu'elle juge change (le cas de
QUA-013, dont le workflow de CI a changé sans faire tomber l'attestation,
reste donc ouvert ici). Résultat attendu : chaque contrat attesté déclare les
chemins qu'il juge, et sa première réattestation (version 3) par l'humain
suit.

## Existant (relevé le 2026-10-21)

- 13 contrats sont `ATTESTED` dans ce dépôt, sans `**Couvre**` ; `drwil doctor`
  rend un avertissement « Couverture des attestations » qui les liste.
- Déclarer un `**Couvre**` change l'empreinte d'une attestation de version 3,
  mais pas celle d'une version 2 (jugée sans couverture) : la réattestation
  est un geste humain (`drwil attest <ID> --renew`).

## Questions à trancher

- Quels chemins chaque contrat attesté juge-t-il réellement (un contrat par
  contrat : QUA-013, etc.) ?
- Réattester tous les contrats d'un coup, ou à mesure qu'ils changent ?
