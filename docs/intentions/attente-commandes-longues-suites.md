# Intention : suites de l'attente outillée des commandes longues

**Statut** : proposée le 2026-11-03 — limites laissées par la clôture du chantier « attente outillée des commandes longues ».

## Besoin

`.githooks/wait-command.mjs` (QUA-219, QUA-220) et la consigne du sous-agent `drwil-checks` (QUA-221) évitent les
boucles `pgrep` sous Claude Code. Trois limites restent.

## Questions à trancher

- [décision] Les autres outils (Copilot CLI, Gemini, Codex) : le script est livré à tous, mais seule la consigne de
  Claude Code l'impose ; faut-il l'imposer aux leurs, au rythme du contrat de compatibilité des outils ?
- [IA] Windows : la commande passe par le shell par défaut (`shell: true`) et le test d'attente n'est pas rejoué sous
  Windows en CI ; ajouter la matrice ou documenter la limite.
- [décision] QUA-221 ne prouve que le texte de la consigne, pas que le modèle la suive ; un contrôle (garde de
  commande refusant `while pgrep`) avait été écarté au cadrage : le rouvrir si la boucle revient.
