# Intention : modifier ou retirer un contrat par commande

**Statut** : proposée le 2026-11-05, limite de la clôture du chantier `commande-de-contrat` (journal du 2026-11-05).

## Besoin

`drwil contracts add` et `drwil contracts adopt <ID>` ajoutent un contrat sans édition à la main. Modifier ou
retirer un contrat reste une édition manuelle du registre : à décider si une commande doit aussi le faire.

## Existant (relevé le 2026-11-05)

- Modifier ou retirer un contrat change les règles du jeu : geste humain, hors de la commande (`QUA-050`, `AGENTS.md`).
- `drwil contracts` valide le registre sans rien écrire ; `add` et `adopt` refusent sans rien écrire sur un ID déjà
  défini ou un registre invalide (QUA-241, QUA-243).

## Questions à trancher

- [décision] Une commande humaine `drwil contracts remove <ID>` ou `edit <ID>` apporte-t-elle assez par rapport à
  l'édition à la main du registre pour justifier un contrat de plus ?
- [décision] Si oui, quel garde-fou : le oui de l'humain lu par l'outil (comme l'attestation depuis le chat) ?
