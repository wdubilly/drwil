# Entretien courant

Fiche permanente pour les petites tâches qui ne justifient pas un chantier
séparé (faute corrigée, petit ajustement local signalé en passant…). Un
sujet qui grossit ou qui demande une décision devient un chantier normal,
listé dans `docs/projets/en-attente.md`.

Le contrôle au commit signale un fichier de code qu'aucune fiche ne couvre
(rappel de cadrage, sévérité réglable — `docs/ia-first.md`, section 7). Pour une
petite tâche, ajouter son chemin au bloc `cadrage` ci-dessous ; un motif trop
large (`**`, `scripts/*`) est refusé, il faut nommer le fichier ou un motif
précis.

<!-- cadrage
fichiers:
-->

## Journal

| Date | Tâche | Statut |
|---|---|---|
| 2026-10-06 | Le `.gitignore` du gabarit était absent du paquet npm (npm retire tout `.gitignore`) : livré sous le nom `gitignore`, renommé à l'installation (`packages/drwil/src/index.ts`) ; test via `npm pack --dry-run`. | fait |
