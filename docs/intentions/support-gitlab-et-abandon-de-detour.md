# Intention : le kit fonctionne sur GitLab et un détour peut être abandonné

**Statut** : proposée le 2026-11-12 — limite relevée par le projet adoptant `marinade-poulet` (drwil 0.11.1, GitLab).

## Besoin

- `state.mjs reopen`, `detour.mjs resume`, `.githooks/merge-auto.mjs` et `.githooks/pr-watch.mjs` demandent `gh`. Sans lui : « l'état de
  la PR est inconnu » ou « gh injoignable ». `reopen` refuse alors de rouvrir un chantier clos ; `resume` refuse de
  fermer un détour car il ne reconnaît que les fusions classiques.
- Aucune commande n'abandonne un détour : s'il ne peut pas être fusionné, l'état reste coincé ; l'adoptant a dû faire
  un `git switch`, un `git stash apply`, puis `state.mjs move SCOPING` à la main.
- `glab mr merge --auto-merge` renvoie 405 tant que le pipeline tourne ; `glab mr close` a échoué alors que l'API
  GitLab répondait.

## Existant

- Les commandes citées vivent dans `.githooks/` ; aucune ne parle `glab`.

## Questions à trancher

- [décision] Prise en charge de `glab` (ou de l'API GitLab) dans les commandes ci-dessus, ou abstraction de la forge.
- [décision] Commande d'abandon d'un détour (`detour.mjs abandon` ?) et ce qu'elle fait de la branche et de l'état.
- [décision] Comportement de `merge-auto` sur GitLab quand le pipeline tourne (attendre, puis fusionner).

Le défaut voisin (fichier neuf non couvert à la clôture, trailer perdu) est cadré à part :
`docs/projects/fichier-neuf-couvert-apres-cloture.md`.
