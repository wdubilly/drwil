# Intention : essais réels de l'attestation depuis la conversation

**Statut** : proposée le 2026-11-04, limites de la clôture du chantier `attester-depuis-le-chat` (journal du 2026-11-04).

## Besoin

L'attestation depuis la conversation est livrée pour cinq outils, mais aucun essai interactif réel n'a été fait :
tout est testé avec des événements fictifs. Le demandeur préfère l'éprouver dans ses prochains développements et
ouvrir une fiche de correction si un défaut apparaît, plutôt que de la bloquer par des essais dédiés.

## Existant

- Relevé du 2026-11-04 : hooks natifs livrés pour Claude Code, Copilot CLI, Gemini CLI et Codex ; client ACP
  dédié `drwil cursor-acp` pour Cursor. Matrice : `docs/ia-first/6-limits-and-tool-compatibility.md`, colonne
  « essai interactif réel » à « aucun » pour les cinq outils.
- Le protocole d'essai réel (candidate empaquetée, contrat et fichier fictifs, refus puis jugement, preuve
  changée, abandon, rejeu) est décrit dans `docs/recipes/adopt-the-kit.md`.
- Cursor : le binaire `agent acp` n'a jamais été lancé ; un essai consomme des crédits.
- Les contrats QUA-236 et QUA-063 ont été attestés par le demandeur le 2026-11-04 sur le sondage et la matrice
  tels que livrés, essais réels en limite.

## Questions à trancher

- [humain] Dater dans la matrice le premier essai réel de chaque outil, au fil des développements du demandeur.
- [décision] Un défaut vu à l'usage ouvre une fiche de correction ; faut-il aussi un essai dédié par outil avant
  la 0.12.0, ou l'usage suffit-il ?
- [décision] Cursor : garder le client ACP dédié ou attendre un canal natif du chat habituel ?
