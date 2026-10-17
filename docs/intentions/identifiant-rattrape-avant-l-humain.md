# Intention : la note de fin de réponse s'affiche bien, sans coût pour le modèle

**Statut** : proposée le 2026-10-17 — constaté par le demandeur (« la
mécanique imposant de décrire le contrat et pas uniquement son ID ne
fonctionne pas très bien »).

**Revu le 2026-10-17** : réalisé par le chantier « un identifiant cité sans
libellé est complété sous la réponse de l'agent » (journal du 2026-10-17) —
hook de fin de réponse, glossaire élargi, rappel réduit ; les questions de
cadrage sont tranchées. Reste vivant : vérifier, après la fusion, ce que la
documentation ne garantit pas.

## Besoin

Le hook de fin de réponse (`.claude/hooks/reply-glossary.mjs`, événement
`Stop`) affiche sa note par `systemMessage`. D'après la documentation des
hooks Claude Code (lue le 2026-10-17), ce champ est « montré à
l'utilisateur » ; ne sont pas documentés : son affichage exact dans le
terminal, l'application web et l'application desktop, et son absence de
coût en tokens (non injecté au modèle). Un hook ne se charge qu'au
démarrage d'une session : l'agent qui l'écrit ne peut pas l'observer.

## Existant (vérifié le 2026-10-17)

- La logique est prouvée par les tests (QUA-039, un identifiant cité à
  l'humain vient avec ce qu'il désigne) : quels identifiants, quelle note,
  jamais bloquant, rien dans `hookSpecificOutput`.
- Décision du demandeur (2026-10-17) : vérifier après la fusion, dans une
  nouvelle session.

## Questions à trancher

- [humain] Ouvrir une nouvelle session Claude Code dans ce dépôt, provoquer
  une réponse qui cite un identifiant nu, et dire si la note apparaît
  sous la réponse (terminal ; web et desktop si utilisés).
- [décision] Si elle n'apparaît pas, ou si elle coûte des tokens : autre
  canal (par exemple `additionalContext` au tour suivant), ou retrait ?
