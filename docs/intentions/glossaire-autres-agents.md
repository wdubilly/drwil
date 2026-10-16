# Intention : le glossaire des identifiants injecté aussi chez les autres agents

**Statut** : proposée le 2026-10-16 — limite du chantier « Un identifiant
cité à l'humain vient avec ce qu'il désigne » (journal du 2026-10-16).

## Besoin

Le glossaire des identifiants (QUA-039) a trois couches : à la source
(sorties de drwil), une commande pour tout agent, et une injection
automatique là où l'agent a des hooks. Seul Claude Code a aujourd'hui ce
hook (`.claude/hooks/id-glossary.mjs`) ; drwil se veut agnostique de
l'agent, et d'autres outils ont ajouté des hooks.

## Existant (vérifié le 2026-10-16)

- `.githooks/glossary.mjs` est la seule source ; le hook Claude Code ne
  fait que l'appeler et mettre en forme : un adaptateur par outil suffirait.
- Le gabarit ne livre aux autres outils que des fichiers d'instructions
  (`packages/drwil/templates/common/tools/copilot/.github/copilot-instructions.md`,
  `packages/drwil/templates/common/tools/cursor/.cursor/rules/ia-first.mdc`), qui
  donnent la règle et la commande.

## Questions à trancher

- [décision] Quels outils d'abord (Cursor, Copilot CLI, Gemini CLI,
  Codex), après vérification de leur format de hook ?
- [décision] Un adaptateur par outil livré dans le gabarit, ou seulement
  pour les outils choisis à `init` (`--tools`) ?
