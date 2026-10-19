# Intention : établir la cause du dépassement de 30 s des hooks en session interactive de Copilot CLI

**Statut** : proposée le 2026-10-19 — limite du chantier « Compatibilité des agents, Copilot CLI tenu » (journal du 2026-10-19).

## Besoin

Les journaux du 2026-10-15 (Copilot CLI interactif, version plus ancienne)
montrent `.githooks/state.mjs reminder` dépassant le délai de 30 s ; Copilot laisse
alors passer l'appel. Le chantier n'a pas reproduit ce dépassement : en mode
non interactif (version 1.0.98) les hooks répondent, et `.githooks/state.mjs` répond en
66 ms avec une entrée ouverte. Les hooks ne dépendent plus de la fin de
l'entrée (lecture dès que le JSON est complet, repli de 2 s), mais la cause du
dépassement interactif n'est pas établie.

## Existant (vérifié le 2026-10-19)

- Banc, Copilot CLI 1.0.98, mode non interactif : hooks lancés, réponses dans le délai.
- Session interactive : non rejouée.

## Questions à trancher

- [décision] Rejouer à la main une session interactive sur 1.0.98, hooks
  chronométrés, et attester le résultat ? Le banc ne gère que le mode `-p`.
