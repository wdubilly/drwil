# Preuve de clôture — drwil-serve

**Clos le** : 2026-11-08
**Commit vérifié** : `aa5f6cf14e` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:34b652b87d4893f1`, acceptés par l'humain au lancement le 2026-11-08

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| drwil serve sert le dépôt courant en lecture seule, sur 127.0.0.1 par défaut, sans écrire aucun fichier suivi et sans dépendance d'exécution nouvelle — contrat à créer | `QUA-280` | `tests-qua-280` | — |
| Hors de 127.0.0.1 (--host), le serveur refuse de démarrer sans jeton et refuse toute requête sans jeton valide ; le jeton n'apparaît jamais dans une sortie lue par le modèle — contrat à créer | `QUA-281` | `tests-qua-281` | — |
| Aucune donnée nominative (auteur, login, courriel) ni secret dans une réponse de l'API — contrat à créer | `QUA-271` | `tests-qua-271` | — |
| drwil serve --detach est idempotent : serveur déjà démarré pour ce projet, il redonne son adresse sans en lancer un second ; deux projets ou worktrees ouverts ensemble ont chacun leur serveur — contrat à créer | `QUA-272` | `tests-qua-272` | — |
| Un projet sans .drwil/usage.jsonl, sans preuves ou sans forge joignable affiche ses vues vides, sans erreur, et dit ce qui manque — contrat | `QUA-275` | `tests-qua-275` | — |
| Les vues CI, PR et MR fonctionnent à parité sur GitHub (gh) et GitLab (glab), la forge étant détectée — contrat | `QUA-273` | `tests-qua-273` | — |
| Le journal d'événements est propre à chaque projet et vit hors du dépôt — contrat | `QUA-274` | `tests-qua-274` | — |
| La page s'utilise sur un écran de 360 px de large, sans défilement horizontal, en français et en anglais selon lang — contrat [humain] | `QUA-276` | `tests-qua-276` | `sha256:5a6229d68268fc4b` (1 fichier(s)) |
| À l'ouverture d'une session, un projet qui a choisi le démarrage automatique voit le serveur démarré s'il ne tournait pas, et l'humain reçoit le lien sans qu'aucun octet n'entre dans le contexte du modèle ; un outil qui ne sait pas montrer ce message donne le lien par le skill — contrat | `QUA-277` | `tests-qua-277` | — |
| Sans Tailscale, le serveur et le message d'accueil fonctionnent en local, sans erreur, et le message dit comment ouvrir l'accès au téléphone ; avec Tailscale, le lien donné est celui du réseau privé — contrat | `QUA-278` | `tests-qua-278` | — |
| Le démarrage automatique est proposé à l'installation et n'est jamais activé sans réponse de l'humain ; il n'écoute que sur 127.0.0.1 — contrat | `QUA-279` | `tests-qua-279` | — |
| drwil serve montre tout ce que montraient drwil-progress et le module optional/dashboard, tendances de QUA-198 comprises ; leur retrait est reporté à docs/intentions/retrait-de-drwil-progress.md — contrat [humain] | `QUA-276` | `tests-qua-276` | `sha256:5a6229d68268fc4b` (1 fichier(s)) |
