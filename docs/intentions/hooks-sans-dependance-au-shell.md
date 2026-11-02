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

## Existant (relevé le 2026-11-02)

- Les hooks git (`.githooks/pre-commit`) testent déjà `command -v node` et refusent avec un
  message lisible : le défaut ne les concerne pas.
- Les hooks des assistants appellent `node` nu, sans ce test : `.claude/settings.json`
  (`node "${CLAUDE_PROJECT_DIR}/.githooks/state.mjs"`, `.claude/hooks/*.mjs`).
- Le hook Copilot est déclaré dans le gabarit `packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json` ;
  ce dépôt n'en porte pas de copie installée.
- Contrats cités par les titres : QUA-044 (les hooks lisent la racine du projet, pas le dossier
  courant) et QUA-065 (les hooks de Copilot parlent son format, sans jamais bloquer).

## Questions à trancher

- Le hook Copilot ne bloque jamais (QUA-065) : le « fail-closed » vaut-il pour Claude Code
  seulement ? Lire le texte de QUA-065 et de QUA-044 avant de cadrer.
- Où écrire le chemin absolu de `node` (piste 1) : à l'installation, dans les réglages des
  assistants, ou dans un petit lanceur partagé ? Le fichier livré s'édite dans le gabarit
  seulement (miroirs-gabarit).
- Un message lisible est-il possible quand `node` est absent, puisque le hook est lui-même
  une commande `node` ? Il faudra une commande de repli `sh` dans la déclaration du hook.
