# Intention : retirer le protocole d'attestation à nonce de Copilot CLI, devenu inutile

**Statut** : proposée le 2026-11-19 — limite hors cadre du chantier « tout geste humain se fait aussi depuis le
chat, et l'attestation se fait par lot » (lot 5, Copilot CLI ; son entrée dans `docs/projects/journal.md`), notée
en intention par le demandeur au sondage des limites.

## Besoin

Sous Copilot CLI, l'attestation passait par un protocole propre : un nonce tiré à chaque question, posé dans la
question d'`ask_user` (forme `question` / `choices`), puis vérifié par le hook dans la réponse. Le lot 5 a montré, sur
les journaux réels de Copilot CLI 1.0.112, que ce protocole n'a jamais fonctionné (`ask_user` prend `message` et
`requestedSchema`) et l'a remplacé par le socle commun des sondages préparés (`.claude/hooks/copilot-polls.mjs`,
provenance `copilot-poll`). Le code du nonce reste en place sans servir à Copilot. Le demandeur veut le retirer, sans
casser un autre outil qui s'en servirait encore.

## Existant

Relevé le 2026-11-19, non vérifié en détail : la forme Copilot du protocole vit dans
`packages/drwil/src/attest-portable.ts`, la branche Copilot de `.claude/hooks/attest-adapters.mjs` et de
`.claude/hooks/portable-attest.mjs` (gabarit `packages/drwil/templates/common/tools/claude/.claude/hooks/`), et leurs
tests (`packages/drwil/test/portable-attest.test.mjs`). Contrat concerné : QUA-235 (le hook d'attestation ne confirme
que la réponse humaine à un sondage préparé).

## Questions à trancher

- [décision] Le nonce sert-il encore à un autre outil (Gemini CLI, Codex) ? Si oui, ne retirer que la branche Copilot.
