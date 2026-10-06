# Recette : créer une release (tag + note GitHub)

Objectif : marquer un chantier fusionné par un tag Git (`vX.Y.Z`) et une
note de release, sans publier sur npm et sans committer le moindre
fichier (compatible avec un contrat du type « pas de commit direct sur la
branche principale », si adopté).

Ce n'est **pas un contrôle installé par défaut** dans le gabarit du kit :
le script est un module optionnel, comme le tableau de bord — voir le
README de `templates/common/optional/creer-une-release/` (module du
paquet du kit). Sur ce dépôt, il est déjà activé en
`.githooks/creer-release.mjs`. Comme un commit ou un push, ce script ne
se lance que sur demande explicite de l'utilisateur, jamais tout seul en
CI.

## Méthode (une fois le module activé)

1. Aperçu sans rien créer : `node .githooks/creer-release.mjs --dry-run`
   — affiche le dernier tag, le bump détecté (majeur/mineur/patch) et la
   version suivante.
2. La version : s'il y a des paquets npm publiables (package.json suivi,
   avec un `name`, sans `"private": true`), le tag est **`v` + leur
   `version`** — source unique, décidée dans une PR avec
   `npm version patch|minor|major --no-git-tag-version`. Le script refuse
   (code 1, y compris en `--dry-run`) un tag déjà existant, une version qui
   n'augmente pas ou des paquets en désaccord. Sans paquet npm, la version
   est calculée *best-effort* depuis les messages de commit depuis le
   dernier tag, façon Conventional Commits (`feat:` → mineur, rupture
   annoncée → majeur, sinon patch par défaut) ; avec des paquets, ce calcul
   n'est qu'une suggestion affichée.
3. Créer réellement : `node .githooks/creer-release.mjs` (tag annoté
   poussé sur `origin`, puis `gh release create --generate-notes` si
   `gh` est disponible et authentifié).
4. Si le dépôt contient un ou plusieurs paquets npm publiables
   (package.json suivi, avec un `name`, sans `"private": true`), un
   tarball (`npm pack`) est construit pour chacun et attaché comme asset
   téléchargeable à la release GitHub — utile pour donner le paquet à
   tester sans publier sur npm (c'est le cas de `packages/drwil` sur ce
   dépôt). `--dry-run` liste les paquets qui seraient empaquetés sans
   rien construire.
5. Erreur de version pour une fois (tag mal calculé) : supprimer le tag
   (`git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`) et relancer
   une fois la correction en place — jamais de réécriture de l'historique
   partagé.

## Limites assumées

- Pensé pour GitHub (`gh release create`) ; sur GitLab, seul le tag Git
  est posé par le script, la note de release reste à créer via l'API
  Releases de GitLab (best-effort, non couvert).
- Ne publie jamais sur npm : décision séparée, hors de cette recette.
