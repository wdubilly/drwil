# Intention : un détour peut être abandonné, et merge-auto attend le pipeline GitLab

**Statut** : proposée le 2026-11-12 — limite relevée par le projet adoptant `marinade-poulet` (drwil 0.11.1, GitLab).
Revu le 2026-11-12 : le support GitLab de `.githooks/merge-auto.mjs`, du nettoyage des branches, de
`state.mjs reopen` et de `detour.mjs resume` est fait (journal, `docs/projects/journal.md`, entrée du 2026-11-12
« La fusion automatique et le nettoyage des branches fonctionnent sur GitLab ») ; `.githooks/pr-watch.mjs`
parlait déjà `glab` (QUA-262). Restent les points ci-dessous.

## Besoin

- Aucune commande n'abandonne un détour : s'il ne peut pas être fusionné, l'état reste coincé ; l'adoptant a dû faire
  un `git switch`, un `git stash apply`, puis `state.mjs move SCOPING` à la main.
- `glab mr merge --auto-merge` renvoie 405 tant que le pipeline tourne : `.githooks/merge-auto.mjs` le traite
  aujourd'hui comme « fusion automatique non permise » (code 1, rester en CLOSING), sans attendre le pipeline.
- `glab mr close` a échoué alors que l'API GitLab répondait.

## Existant

- `.githooks/merge-auto-forge.mjs` (client gh et glab) ; `.githooks/detour.mjs` (ouverture et reprise d'un détour,
  pas d'abandon).

## Questions à trancher

- [décision] Commande d'abandon d'un détour (`detour.mjs abandon` ?) et ce qu'elle fait de la branche et de l'état.
- [décision] Comportement de `merge-auto` sur GitLab quand le pipeline tourne (attendre, puis programmer la fusion).
- [décision] Repli quand `glab mr close` échoue alors que l'API répond.

Le défaut voisin (fichier neuf non couvert à la clôture, trailer perdu) est cadré à part :
`docs/projects/journal.md`.
