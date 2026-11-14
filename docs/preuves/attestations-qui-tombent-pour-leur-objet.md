# Preuve de clôture — attestations-qui-tombent-pour-leur-objet

**Clos le** : 2026-11-14
**Commit vérifié** : `7b24f58e0b` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:3eb7fdbd174a6c06`, acceptés par l'humain au lancement le 2026-11-14

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| node outils/inventaire-attestations.mjs donne, par contrat qui déclare **Couvre**, ses fichiers couverts, son nombre d'attestations archivées dans .drwil/evidence/attestations/ et le nombre de commits qui ont changé chaque fichier couvert depuis une date donnée, sans rien écrire ; l'inventaire avant et après le chantier est recopié dans l'entrée du journal | `QUA-299` | `tests-qua-299` | — |
| QUA-013 (contrôle non exécuté n'est pas passé) et QUA-175 (aucun agent ne peut écrire l'acceptation des critères) passent en test en dur : leur champ **Manuel** et leur **Couvre** sont retirés, et un test prouve ce que l'humain lisait (QUA-013 : la sortie d'un contrôle non exécuté ne vaut jamais un succès ; QUA-175 : seul .githooks/state-acceptance.mjs écrit le fichier d'acceptation, parmi les hooks et commandes du kit) — QUA-013, | `QUA-175` | `tests-qua-175` | — |
| QUA-048 et QUA-067 ne couvrent plus .githooks/state.mjs : ils gardent leurs modules dédiés (.githooks/close.mjs, .githooks/close-branches.mjs ; .githooks/state-cli.mjs, .claude/hooks/scope-reminder.mjs) — QUA-048, [humain] | `QUA-067` | `tests-qua-067` | `sha256:e0f4609af2dfe186` (2 fichier(s)) |
| QUA-064 et QUA-066 ne couvrent plus packages/drwil/src/config.ts : usesClaudeTree passe dans le module dédié packages/drwil/src/config-tools.ts (neuf), que QUA-064 couvre ; QUA-066 couvre packages/drwil/src/render-gemini.ts — QUA-064, [humain] | `QUA-066` | `tests-qua-066` | `sha256:8fb815705e498274` (2 fichier(s)) |
| QUA-234 ne couvre plus packages/drwil/src/cli-texts.ts : les textes du rapport de défaut passent dans le module dédié packages/drwil/src/cli-report-texts.ts (neuf), qu'il couvre à sa place [humain] | `QUA-234` | `tests-qua-234` | `sha256:d105e4efddde1b0e` (3 fichier(s)) |
| QUA-081 n'est pas affaibli : un fichier couvert modifié fait toujours tomber l'attestation, et ses tests sont inchangés | `QUA-081` | `tests-qua-081` | — |
