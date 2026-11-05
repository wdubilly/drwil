# Preuve de clôture — empreinte-des-fichiers-completes-par-init

**Clos le** : 2026-11-05
**Commit vérifié** : `5d4788aeb8` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:06e600244e1d4a3a`, acceptés par l'humain au lancement le 2026-11-05

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Sur un projet équipé par une version précédente, une mise à jour par init qui complète un fichier du manifeste — intact ou modifié à la main par le projet — commite sans refus de la barrière de périmètre ; un fichier intact reçoit sa nouvelle empreinte au manifeste ; un fichier modifié à la main garde son empreinte d'installation (uninstall et le retrait des fichiers obsolètes ne le suppriment toujours pas) et son empreinte après complétion est notée à part, admise par la barrière seulement pour le commit de mise à jour ; prouvé par un test qui installe, modifie ou non, met à jour puis commite | `QUA-244` | `tests-qua-244` | — |
