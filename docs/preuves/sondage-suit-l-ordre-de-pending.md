# Preuve de clôture — sondage-suit-l-ordre-de-pending

**Clos le** : 2026-10-28
**Commit vérifié** : `35a591d4ed` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| state.mjs briefs liste les fiches d'une version dans l'ordre des lignes ouvertes de la section « Fiches cadrées » de pending.md (celle du HEAD commité), quelles que soient leur priorité et leur maturité | `QUA-160` | `tests-qua-160` | — |
| Une fiche pas prête (décisions ouvertes) garde sa place dans cet ordre, signalée « pas prête : N décision(s) à prendre d'abord », jamais reléguée à la fin | `QUA-160` | `tests-qua-160` | — |
| Une fiche absente de l'index est listée après les fiches indexées, dans l'ordre d'avant (prête, maturité, priorité, chemin) ; une fiche de garantie bloquante (QUA-088) reste seule listée | `QUA-160` | `tests-qua-160` | — |
| Le mode d'emploi du sondage (.claude/skills/start-a-workstream/SKILL.md) dit cet ordre et plus l'ancien | `QUA-160` | `tests-qua-160` | — |
