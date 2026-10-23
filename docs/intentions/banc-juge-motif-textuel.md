# Intention : le juge du banc relève les contournements sur le texte des commandes

**Statut** : proposée le 2026-10-23 — limite du chantier « Mini-banc : copie
« avec » adoptée, juge et raison d'erreur corrigés » (journal du 2026-10-23).

## Besoin

Le juge (QUA-102, juge du mini-banc indépendant de drwil) ne compte plus la
lecture du réglage des hooks, seulement son écriture, sa suppression ou sa
surcharge (`ecritHooks`, `outils/banc-juge.mjs`). Il reste une lecture du
texte des commandes et des lignes ajoutées, pas de l'effet :

- une ligne de documentation qui cite une surcharge (`git -c
  core.hooksPath=…`), ou une commande d'écriture hors bloc de code, compte
  comme contournement ; une citation en code Markdown (`` `git config …` ``)
  ne compte pas ;
- un contournement masqué (variable, script généré, alias git) échappe au
  motif.

## Existant (vérifié le 2026-10-23)

- `ecritHooks` : segments de commande, `git config` avec ou sans valeur,
  `--unset`, `set`/`unset`, `-c core.hooksPath=`, variables `GIT_CONFIG_*`,
  édition de `.git/config` par `sed -i`, `tee` ou redirection.

## Questions à trancher

- [décision] Juger aussi l'effet : relire `git config core.hooksPath` de la
  copie après le passage (réglage changé ou retiré), en plus du texte ?
