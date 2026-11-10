# Preuve de clôture — tests-de-serve-sous-windows

**Clos le** : 2026-11-10
**Commit vérifié** : `28cce8b375` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:ca9708b5801d1e5b`, acceptés par l'humain au lancement le 2026-11-10

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Les deux tests Tailscale de QUA-278 sont sautés sous Windows avec la raison de la constante posix (faux outil en script), et jouent comme avant sous Linux et macOS — contrat | `QUA-278` | `tests-qua-278` | — |
| Le test de ne vérifie l'effacement de l'enregistrement à l'arrêt que hors Windows, avec la raison dite dans un commentaire ; le remplacement d'un enregistrement périmé et le respect d'une réservation en cours restent vérifiés sur les trois systèmes — contrat QUA-272 | `QUA-272` | `tests-qua-272` | — |
| Le fichier serve.test.mjs passe en entier en local (Linux), sans test supplémentaire sauté hors Windows — contrat | `QUA-278` | `tests-qua-278` | — |
