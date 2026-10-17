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
- Vérifié le 2026-10-17 par le demandeur, nouvelle session, terminal : à
  une réponse « QUA-017 » nue, la note « Stop says: [drwil] Identifiants
  cités sans libellé : QUA-017 — Pas de travail direct sur la branche
  principale » s'affiche sous la réponse. Une réponse qui explique déjà
  l'identifiant n'en reçoit pas (normal).

## Questions à trancher

- [humain] Web et desktop, s'ils sont utilisés : la note apparaît-elle
  aussi ? (terminal vérifié le 2026-10-17.)
