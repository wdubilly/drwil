# Intention : suites de l'attente outillée des commandes longues

**Statut** : proposée le 2026-11-03 — limites laissées par la clôture du chantier « attente outillée des commandes longues ».

**Revu le 2026-11-03** : la limite des autres outils est traitée, voir `docs/projects/journal.md`,
par le chantier « outiller tous les outils » (QUA-222, QUA-223) ; restent vivantes celles de Windows et du contrôle de la consigne.

## Besoin

`.githooks/wait-command.mjs` (QUA-219, QUA-220) et la consigne du sous-agent `drwil-checks` (QUA-221) évitent les
boucles `pgrep` sous Claude Code. Trois limites restent.

## Existant (relevé le 2026-11-03)

- Le script est livré à tout projet ; la consigne du sous-agent n'existe que dans l'arbre `.claude` (Claude Code).
- Le script n'a été joué que sous Linux.

## Questions à trancher

- ~~Les autres outils~~ : traité par le chantier « outiller tous les outils » (QUA-222, QUA-223), voir `docs/projects/journal.md`.
- [IA] Windows : la commande passe par le shell par défaut (`shell: true`) et le test d'attente n'est pas rejoué sous
  Windows en CI ; ajouter la matrice ou documenter la limite.
- [décision] QUA-221 ne prouve que le texte de la consigne, pas que le modèle la suive ; un contrôle (garde de
  commande refusant `while pgrep`) avait été écarté au cadrage : le rouvrir si la boucle revient.
