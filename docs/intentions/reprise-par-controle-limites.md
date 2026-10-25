# Intention : surveiller que chaque contrôle ne lit que ses `paths`

**Statut** : proposée le 2026-10-25 — limite non traitée de la clôture « reprise d'un verdict contrôle par contrôle » (journal du 2026-10-25).

## Besoin

La reprise par contrôle (QUA-141) suppose que chaque contrôle ne lit que les
fichiers de son `paths`. Ce dépôt a été audité une fois, par traçage des lectures de
chaque contrôle ; rien ne garde que cela reste vrai quand un contrôle évolue.
Un contrôle qui lirait un nouveau fichier hors de son `paths` serait repris à tort
pendant une itération (la preuve de clôture, elle, reste sur l'arbre entier).
Le verdict humain de `verify` devrait aussi porter lui-même la mention « ne vaut
pas preuve de clôture » (`packages/drwil/src/verdict.ts`).

## Existant

Relevé le 2026-10-25 : un test garde que chaque fichier de test lancé par un
contrôle est sous ses `paths` (`.githooks/engine.test.mjs`) ; le reste de
l'audit n'est pas rejouable.

## Questions à trancher

- Un contrôle de dépôt qui trace les lectures de chaque contrôle (rejoué en CI) vaut-il son coût ?
- Faut-il livrer une aide aux projets qui déclarent leurs `paths` ?
