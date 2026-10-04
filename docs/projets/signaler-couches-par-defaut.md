# Projet : signaler explicitement les couches par défaut non détectées

**Statut** (2026-10-04) : cadré — lot 1 prêt à démarrer.

<!-- cadrage
fichiers:
  - packages/drwil/src/index.ts
-->

## 1. Besoin

Constaté le 2026-10-04 : sur `init()` d'un projet vide (aucune stack
détectable), le kit écrit quand même des couches par défaut
(`backend`/`frontend`, chacune avec son propre `AGENTS.md`) — modifiable via
l'option `--layers`, déjà documentée dans `--help`. Mais rien ne le signale
au moment où la commande tourne : `reportStack()` affiche seulement « Stack
non détectée : à décider par l'utilisateur », sans jamais dire que des
couches par défaut viennent d'être écrites sur le disque ni rappeler
`--layers`. Un utilisateur (humain ou IA) qui ne lit pas `--help` au
préalable découvre le défaut après coup, dans l'arborescence.

## 2. Hors périmètre

- Rendre `init`/`apply` interactifs ou conversationnels (chat IA) : écarté
  dans l'échange précédent — la commande doit rester déterministe et
  utilisable sans IA (décision déjà actée en discussion, pas de fiche
  dédiée car pas de changement demandé).
- Changer la détection de stack elle-même
  (`packages/drwil/src/stack.ts`) : fonctionne déjà correctement
  pour `apply()`.
- Changer le défaut `backend,frontend` : reste le squelette conventionnel,
  seule sa visibilité change.

## 3. Contraintes

- Ne pas casser le format de sortie existant quand une stack est
  réellement détectée (comportement inchangé dans ce cas).

## 4. Décisions

- (2026-10-04) Quand `init()` écrit des couches par défaut sans qu'aucune
  stack n'ait été détectée, afficher un message explicite rappelant
  l'option `--layers`.

## 5. Points à trancher

(aucun — cas simple, pas d'ambiguïté de conception)

## 6. Lots

- **Lot 1 — message explicite** [IA] : dans `reportStack()` (ou juste
  après son appel dans `init()`), si la stack est vide ET qu'aucune option
  `--layers` explicite n'a été fournie, afficher un message du type
  « couches par défaut écrites : backend, frontend — modifiable avec
  --layers ». Critère de sortie : test ajouté (cas non passant : message
  absent avant correctif ; cas passant : message présent après), 34/34 (ou
  plus) tests verts.

## 7. Reprise

- **Dernier état** (2026-10-04) : lot 1 codé et vérifié. Preuve rouge
  (dossier `/tmp` neuf, `init` sans `--layers` → aucun message) puis verte
  (même scénario après correctif → « Couches par défaut écrites : backend,
  frontend — modifiable avec --layers. »). 2 tests ajoutés (cas passant et
  non passant). 36/36 tests verts, `.githooks/run-checks.mjs` vert sur drwil.
- **Travail non commité** : `packages/drwil/src/index.ts`,
  `packages/drwil/test/kit.test.mjs`.
- **Prochaine étape** : [humain] confirmer le commit.
