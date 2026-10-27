# Intention : comprendre l'échec intermittent de la couverture des hooks sous charge

**Statut** : proposée le 2026-10-27 — relevé pendant la vérification du chantier de l'`AGENTS.md` court ; cause non diagnostiquée, décision du demandeur de poursuivre sans la chercher.

## Besoin

Le contrôle « hooks de gouvernance : tests + couverture » (QUA-004, seuil de couverture de test) a échoué deux fois, lancé par `run-checks` à travers le sous-agent `drwil-checks`, pendant un build de plus de 200 secondes en parallèle : couverture à 96,55 % puis 94,24 % au lieu de 100 %, avec `state-cli`, `state-reopen`, `state-texts` et `worktree` presque non couverts, comme si leurs tests ne s'étaient pas exécutés. Le même contrôle a toujours réussi en passage seul, sur la branche du chantier comme sur la branche principale (`run-checks` complet, `npm run test:hooks:coverage`, y compris sous charge CPU artificielle). Un contrôle qui échoue sans cause connue fait perdre une vérification et pousse à la relancer jusqu'au vert.

## Existant

Relevé le 2026-10-27, non diagnostiqué : la sortie complète du test en échec n'a pas été conservée (le dossier temporaire gardé ne contenait que des répertoires de test de `create-release`). Aucun code du chantier n'a touché `.githooks/`.

## Questions à trancher

- [décision] Faut-il conserver la sortie complète d'un contrôle en échec dans `.drwil/evidence/run-checks.log` (si présent), pour pouvoir diagnostiquer un échec non reproduit ?
- [décision] Faut-il chercher la cause (concurrence entre le build et les tests des hooks, durée limite, état partagé), et dans quel chantier ?
