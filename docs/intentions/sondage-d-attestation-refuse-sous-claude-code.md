# Intention : le sondage d'attestation sous Claude Code enregistre la réponse « Attester »

**Statut** : proposée le 2026-11-07 — limite du chantier « un contrôle lent se joue une seule fois, en CI » (journal du 2026-11-07).

## Besoin

Premier essai réel sous Claude Code, le 2026-11-07, sur QUA-013 : préparation par `drwil attest-poll` et contrôle avant affichage passés ; après la réponse « Attester », `.claude/hooks/attest-poll.mjs` a refusé (« sondage d'attestation refusé … aucune attestation enregistrée », sans exception). Les cinq attestations du chantier ont été faites au terminal, en repli. Suite de `docs/intentions/attestation-chat-essais-reels.md`.

## Existant (relevé le 2026-11-07)

- Le refus vient d'une des deux comparaisons après réponse : sondage relu (`tool_input`) différent de celui enregistré avant l'affichage, ou réponse absente de `tool_response.answers` sous la clé du texte de la question. Non reproduit.
- Aucune attestation de source `claude-poll` dans `.drwil/evidence/attestations/`.

## Questions à trancher

- [décision] Ouvrir une fiche de correction (reproduire avec l'événement réel de Claude Code, puis corriger) : priorité ?
