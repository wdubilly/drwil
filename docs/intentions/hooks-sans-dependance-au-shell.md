# Intention : hooks du kit indépendants du PATH du shell

**Statut** : proposée le 2026-11-02 — demande de l'humain.

## Constat

Les hooks du kit (`.githooks/*.mjs`, hooks `preToolUse` des assistants) appellent `node`
en le cherchant dans le `PATH` hérité. Avec fnm, `node` n'existe que dans
`/run/user/<uid>/fnm_multishells/<id>/bin`, un dossier propre au shell qui l'a initialisé.
Un assistant lancé depuis un autre shell, ou resté ouvert après sa fermeture, exécute les
hooks sans `node` : code de sortie 127. Le hook refuse alors tout, y compris la lecture
de l'état de gouvernance.

## Pourquoi c'est un défaut du kit

- Le kit suppose un environnement (`node` présent dans le `PATH` du processus) qu'il ne
  vérifie ni ne documente : ce n'est pas portable.
- L'échec est opaque : « hook errored », sans cause ni piste de correction.
- Le blocage est total : l'agent ne peut plus rien lire. Il est fail-closed, ce qui est
  voulu ; c'est le message qui manque.

## Besoin (à cadrer)

Un hook doit fonctionner quel que soit le shell de lancement, ou dire clairement pourquoi
il ne le peut pas.

## Pistes

1. Résoudre `node` dans le hook : chemin absolu écrit à l'installation, ou repli sur un
   `node` stable (`~/.local/bin`, `fnm default`, `process.execPath`).
2. Faire échouer le hook avec un message lisible : « node introuvable dans le PATH, relancer
   l'assistant depuis un shell où `which node` répond », au lieu de « hook errored ».
3. Contrôle d'installation (`init` / `verify`) qui vérifie que `node` se résout depuis un
   environnement minimal (`env -i`), et qui avertit sinon.
4. Documenter le prérequis et le piège fnm multishell dans `INSTALL.md` (en anglais).

## Hors périmètre

- Affaiblir le fail-closed des hooks (QUA-019 : pas de contournement).
- Gérer d'autres gestionnaires de versions (nvm, asdf) au-delà de la résolution générique.

## Critères de réussite

- Un assistant lancé avec un `PATH` sans `node` produit un message explicite, pas un 127 muet.
- Un test reproduit le cas avec `env -i` ou un `PATH` vidé.
- `INSTALL.md` décrit le prérequis.

## Questions ouvertes

- Où est déclaré le hook `preToolUse` (`.claude/settings.json`, `.github/hooks/` ?) et est-il
  copié depuis le gabarit `packages/drwil/templates/` ? Il faudra alors éditer le gabarit
  seulement (miroirs-gabarit).
- Quel contrat existant s'applique (`node .githooks/glossary.mjs --contracts`) ?
