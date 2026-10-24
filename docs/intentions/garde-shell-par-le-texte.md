# Intention : la garde shell juge l'effet d'une commande, pas son texte

**Statut** : proposée le 2026-10-24 — limite du chantier « les
contournements restants fermés ou assumés » (journal du 2026-10-24).

## Besoin

La garde shell de Claude Code (QUA-114, refus du saut des hooks et de
l'écriture de `core.hooksPath`) lit le texte de la commande. Elle se trompe
dans les deux sens :

- **trompée** par une commande construite avec des variables
  (`o=--no-verify; git commit $o`, nom de réglage assemblé) : elle passe ;
- **trop stricte** sur un texte entre guillemets qui ne fait que citer une
  telle commande : un heredoc qui écrivait de la documentation la citant a
  été refusé pendant le chantier.

La CI rattrape le premier cas (rejeu des contrôles) ; le second gêne
l'agent sans protéger.

## Existant (relevé le 2026-10-24)

- `packages/drwil/templates/common/tools/claude/.claude/hooks/bash-guard.mjs`
  (`skipsHooks`) découpe la commande composée et les `sh -c`, sans
  évaluer les variables ni distinguer un argument cité d'une commande.
- Même limite côté banc : `docs/intentions/banc-juge-motif-textuel.md`.

## Questions à trancher

- [décision] Ignorer le contenu d'un heredoc et d'un argument cité qui
  n'est pas lui-même exécuté (`sh -c`, `eval`), refuser toute commande git
  dont un argument vient d'une variable, ou assumer les deux limites,
  la CI restant le filet ?
