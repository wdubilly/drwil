# Entretien courant

Fiche permanente pour les petites tâches qui ne justifient pas un chantier
séparé (faute corrigée, petit ajustement local signalé en passant…). Un
sujet qui grossit ou qui demande une décision devient un chantier normal,
listé dans `docs/projects/pending.md`.

Le contrôle au commit signale un fichier de code qu'aucune fiche ne couvre
(rappel de cadrage, sévérité réglable — `docs/ia-first.md`, section 7). Pour une
petite tâche, ajouter son chemin au bloc `cadrage` ci-dessous ; un motif trop
large (`**`, `scripts/*`) est refusé, il faut nommer le fichier ou un motif
précis.

<!-- scope
files:
  - docs/recipes/working-with-branches.md
  - outils/miroirs.json
  - packages/drwil/src/evidence.ts
  - packages/drwil/test/kit.test.mjs
  - README.md
-->

## Journal

| Date | Tâche | Statut |
|---|---|---|
| 2026-10-06 | Le `.gitignore` du gabarit était absent du paquet npm (npm retire tout `.gitignore`) : livré sous le nom `gitignore`, renommé à l'installation (`packages/drwil/src/index.ts`) ; test via `npm pack --dry-run`. | fait |
| 2026-10-14 | Renvois vers la fiche « Protéger master » supprimée, remplacés par le journal du 2026-10-13 (`docs/recipes/working-with-branches.md`, `outils/miroirs.json`). | fait |
| 2026-10-16 | Caviardage des clés privées en temps linéaire (`packages/drwil/src/evidence.ts`) : le motif paresseux « BEGIN … END » était quadratique sur une entrée qui répète BEGIN sans END (alerte CodeQL #1, `js/polynomial-redos`, réapparue en déplaçant le code et bloquant la PR #98, remplacée par ce correctif). Recherche BEGIN puis END suivant ; une clé chiffrée à l'ancienne (tirets dans l'en-tête) reste caviardée en bloc ; test : 1 927 ms avant, 16 ms après. | fait |
