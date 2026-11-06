# Preuve de clôture — fusion-reprogrammee-efface-le-rappel

**Clos le** : 2026-11-06
**Commit vérifié** : `e6f36ee53d` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:30c9a6f7b927fc92`, acceptés par l'humain au lancement le 2026-11-06

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Quand la PR est fusionnée par la commande elle-même (CI déjà verte), node .githooks/merge-auto.mjs sort en succès et dit « fusionnée », jamais « programmée » ; une PR ni programmée ni fusionnée reste un échec | `QUA-162` | `tests-qua-162` | — |
| Quand node .githooks/merge-auto.mjs voit la fusion programmée sur la PR marquée par merge_cancelled, il efface la marque et le dit ; une PR autre que celle de la marque, ou une fusion non programmée, la laisse | `QUA-181` | `tests-qua-181` | — |
