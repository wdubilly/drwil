# Intention : une annonce juste du oui à l'ouverture d'un détour qui cite le registre

**Statut** : proposée le 2026-10-19 — limite du chantier « un contrat
ajouté pendant un détour, sans arrêter la file » (journal du 2026-10-19,
0.6.6, 3 sur 4).

## Besoin

Pendant un détour, un ajout pur au registre des contrats passe désormais
sans le oui de l'humain (QUA-050, un détour pour une correction
intercalée). Mais à l'ouverture, `node .githooks/detour.mjs open … --files
docs/contracts.md` annonce encore « le oui de l'humain sera demandé » pour
le registre, alors qu'il ne le sera que si un contrat existant est modifié
ou retiré : l'annonce peut faire s'arrêter un sous-agent pour rien.

## Existant (vérifié le 2026-10-19)

- `.githooks/detour.mjs` (`open`, texte `rulesAhead`) : liste les fichiers
  de `--files` reconnus par `rulesFiles`, registre compris, sans nuance.
- `.githooks/scope-gate.mjs` : juge le registre indexé contre HEAD
  (`contractsAddedOnly`) au moment du commit.

## Questions à trancher

- [décision] Nuancer l'annonce pour le registre (« seulement si un contrat
  existant est modifié ou retiré »), ou retirer le registre de l'annonce ?
