# Recette : créer une release (tag + note GitHub)

Objectif : marquer un chantier fusionné par un tag Git (`vX.Y.Z`) et une
note de release, sans publier sur npm et sans committer le moindre
fichier (compatible avec un contrat du type « pas de commit direct sur la
branche principale », si adopté).

Ce n'est **pas un contrôle installé par défaut** : le script qui calcule
et pose la release est un module optionnel, comme le tableau de bord —
voir le README de `templates/common/optional/creer-une-release/` (module
du paquet du kit) pour l'activer, copié en
`.githooks/creer-release.mjs` (à créer). Comme un commit ou un push, ce
script ne se lance que sur demande explicite de l'utilisateur, jamais
tout seul en CI.

## Méthode (une fois le module activé)

1. Aperçu sans rien créer : `node .githooks/creer-release.mjs --dry-run`
   — affiche le dernier tag, le bump détecté (majeur/mineur/patch) et la
   version suivante.
2. Le bump est calculé *best-effort* depuis les messages de commit non-
   merge depuis le dernier tag, façon Conventional Commits (`feat:` →
   mineur, rupture annoncée → majeur, sinon patch par défaut). Aucun
   format n'est imposé : un message sans préfixe reconnu reste couvert
   par le défaut (patch).
3. Créer réellement : `node .githooks/creer-release.mjs` (tag annoté
   poussé sur `origin`, puis `gh release create --generate-notes` si
   `gh` est disponible et authentifié).
4. Erreur de version pour une fois (tag mal calculé) : supprimer le tag
   (`git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`) et relancer
   une fois la correction en place — jamais de réécriture de l'historique
   partagé.

## Limites assumées

- Pensé pour GitHub (`gh release create`) ; sur GitLab, seul le tag Git
  est posé par le script, la note de release reste à créer via l'API
  Releases de GitLab (best-effort, non couvert).
- Ne publie jamais sur npm : décision séparée, hors de cette recette.
