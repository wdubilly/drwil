# Intention : le hook qui ajoute `Drwil-Brief` ne fabrique pas un commit dont le trailer est le sujet

**Statut** : proposée le 2026-11-06 — limite du chantier « merge-auto dit vrai sur une PR déjà verte, et efface le rappel « fusion annulée » » (journal du 2026-11-06).

## Besoin

`.githooks/prepare-commit-msg` lance `node .githooks/scope-gate.mjs --trailer`, qui ajoute `Drwil-Brief: <fiche active>` par `git interpret-trailers`. Sur un message vide, le commit n'est plus vide : son unique ligne, le sujet, est le trailer. Git l'accepte, mais le trailer n'est alors plus lu comme tel (pas de ligne vide avant), et la barrière de périmètre de la CI refuse le commit faute de `Drwil-Brief` (vu le 2026-11-06 sur ce chantier : le message a dû être corrigé avec l'accord de l'humain).

## Existant (relevé le 2026-11-06)

- `.githooks/prepare-commit-msg` ne bloque jamais (exprès : git ne saute pas ce hook) ; il lance `.githooks/scope-gate.mjs --trailer`.
- `.githooks/scope-gate.mjs` ajoute les trailers par `git interpret-trailers --in-place`, sans regarder si le message est vide.

## Questions à trancher

- [décision] Le hook laisse le message vide (git refuse alors le commit, « Aborting commit due to empty commit message »), ou il signale le message vide sans rien ajouter ?
- [décision] Un contrôle local (`commit-msg` ou pre-push) refuse-t-il un commit dont le sujet est un trailer ?
