# Intention : les essais réels en attente

**Statut** : proposée le 2026-11-13 — regroupement de six intentions lors du ménage du 2026-11-13 ; chaque partie reprend l'une d'elles, avec son statut d'origine.

## Besoin

Plusieurs chantiers ont livré un mécanisme prouvé par des tests (forge simulée, terminal simulé, événements fictifs) sans essai sur un vrai outil, une vraie forge ou une vraie fiche. Ces essais se font au fil de l'usage, souvent en même temps : ils sont regroupés ici pour être faits et datés ensemble.

### la fusion automatique ordonnée éprouvée sur une vraie PR en retard (ex-« merge-auto-eprouve-en-reel »)

Statut d'origine : proposée le 2026-10-28 — limite du chantier « la fusion automatique s'enchaîne dans l'ordre par un outil » (journal du 2026-10-28).

`node .githooks/merge-auto.mjs` n'a été joué qu'avec un `gh` simulé : la mise à jour d'une PR `BEHIND` par `gh pr update-branch`, le recalcul de `mergeStateStatus` qui suit, et le refus « Auto merge is not allowed for this repository » n'ont pas été vus sur une vraie PR.

### la lecture de la CI d'une MR GitLab et la CI GitLab du gabarit, éprouvées en réel (ex-« gitlab-ci-de-la-mr-essai-reel »)

Statut d'origine : proposée le 2026-11-07 — limite du chantier « un contrôle lent se joue une seule fois, en CI » (journal du 2026-11-07).

`.githooks/pr-watch.mjs` et la clôture (`.githooks/close-checks.mjs`) lisent la CI d'une MR GitLab par `glab` (QUA-262), et la CI GitLab du gabarit ne lance qu'une pipeline par push (QUA-263). Tout n'est prouvé que par des réponses de forge simulées et un faux `glab` : aucun essai sur un vrai projet GitLab.

### prouver `start` vers un worktree dans un vrai terminal (ex-« start-worktree-en-vrai-terminal »)

Statut d'origine : noté le 2026-11-06.

QUA-248 (chaque sous-commande de `node .githooks/state.mjs` rend la main dans un vrai processus)
prouve `start` vers un nouveau worktree avec un terminal simulé : le test pose `isTTY` par un
préchargement et répond à chaque question quand elle s'affiche. Un vrai pseudo-terminal
(lecture caractère par caractère, mode brut) n'est pas exercé.

### l'enchaînement des lots éprouvé sur une vraie fiche à lots (ex-« essai-reel-lots-en-sous-agents »)

Statut d'origine : proposée le 2026-10-28 — limite du chantier « une fiche à plusieurs lots se réalise lot par lot, un sous-agent neuf par lot » (journal du 2026-10-28).

Les outils lisent les lots, nomment le lot courant et refusent la clôture tant qu'un lot [IA] n'est pas fait (QUA-166 à QUA-170) ; le skill de lancement dit de donner un sous-agent neuf à chaque lot (QUA-171). Aucun outil ne lance les sous-agents : c'est la consigne qui enchaîne. Le besoin : savoir si, sur une vraie fiche à plusieurs lots, la session principale enchaîne bien les sous-agents, si la passation par les commits et la section « Reprise » suffit, et si la consommation baisse comme attendu.

### essais réels de l'attestation depuis la conversation (ex-« attestation-chat-essais-reels »)

Statut d'origine : proposée le 2026-11-04, limites de la clôture du chantier `attester-depuis-le-chat` (journal du 2026-11-04).

L'attestation depuis la conversation est livrée pour cinq outils, mais aucun essai interactif réel n'a été fait :
tout est testé avec des événements fictifs. Le demandeur préfère l'éprouver dans ses prochains développements et
ouvrir une fiche de correction si un défaut apparaît, plutôt que de la bloquer par des essais dédiés.

### la CI rapide éprouvée en réel, et la preuve de CI de la branche principale hors GitHub (ex-« ci-rapide-epreuves-reelles »)

Statut d'origine : proposée le 2026-11-06 — limites laissées par la clôture du chantier « une PR de doc
passe la CI et fusionne en quelques minutes » (voir `docs/projects/journal.md`).

Le chantier a livré la reprise des verdicts en CI (QUA-250), la levée de « à jour avec master »
(QUA-252) et la file qui attend une branche principale verte (QUA-251). Tout est prouvé par des
tests, rien encore sur une vraie fusion ni sur un vrai GitLab.

## Existant

Chaque partie garde l'existant relevé à sa date, non revérifié au ménage.

### la fusion automatique ordonnée éprouvée sur une vraie PR en retard (ex-« merge-auto-eprouve-en-reel »)

Existant (relevé le 2026-10-28) :

- `.githooks/merge-auto.test.mjs` : ordre des appels, états `UNKNOWN`/`BEHIND`/`DIRTY`, refus du dépôt, programmation non vue, tous avec `gh` simulé.
- `.githooks/pr-watch.mjs` : suit la CI et la fusion, inchangé.

### la lecture de la CI d'une MR GitLab et la CI GitLab du gabarit, éprouvées en réel (ex-« gitlab-ci-de-la-mr-essai-reel »)

Existant (relevé le 2026-11-07) :

- MR lue par `glab mr view --output json` (champ `head_pipeline`), jobs par `glab api projects/:id/pipelines/<id>/jobs` : le remplacement de `:id` et la forme réelle de `head_pipeline` ne sont pas vérifiés.
- `packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml` : pipelines de MR refusées, une pipeline par push de branche.

### prouver `start` vers un worktree dans un vrai terminal (ex-« start-worktree-en-vrai-terminal »)

`.githooks/state-cli-process.test.mjs`, troisième test de QUA-248.

### l'enchaînement des lots éprouvé sur une vraie fiche à lots (ex-« essai-reel-lots-en-sous-agents »)

Le chantier lui-même, réalisé en un seul passage, n'a pas éprouvé l'enchaînement. Relevé à faire : la prochaine fiche à plusieurs lots (`cycle-de-vie-des-fiches`, `attestations-sur-l-effet-et-couvre`), comparée par `.drwil/usage.jsonl` aux chantiers de plus de 60 min.

### essais réels de l'attestation depuis la conversation (ex-« attestation-chat-essais-reels »)

- Relevé du 2026-11-04 : hooks natifs livrés pour Claude Code, Copilot CLI, Gemini CLI et Codex ; client ACP
  dédié `drwil cursor-acp` pour Cursor. Matrice : `docs/ia-first/6-limits-and-tool-compatibility.md`, colonne
  « essai interactif réel » à « aucun » pour les cinq outils.
- Le protocole d'essai réel (candidate empaquetée, contrat et fichier fictifs, refus puis jugement, preuve
  changée, abandon, rejeu) est décrit dans `docs/recipes/adopt-the-kit.md`.
- Cursor : le binaire `agent acp` n'a jamais été lancé ; un essai consomme des crédits.
- Les contrats QUA-236 et QUA-063 ont été attestés par le demandeur le 2026-11-04 sur le sondage et la matrice
  tels que livrés, essais réels en limite.

### la CI rapide éprouvée en réel, et la preuve de CI de la branche principale hors GitHub (ex-« ci-rapide-epreuves-reelles »)

Existant (relevé le 2026-11-06) :

- Le cache des verdicts n'existe qu'après un push sur la branche principale : aucune PR de doc n'a
  encore été mesurée avec la reprise (référence : PR #362, 6 min 40 s de l'ouverture à la fusion).
- La CI GitLab du gabarit télécharge l'artefact de verdicts de la branche principale avec
  `CI_JOB_TOKEN` : jamais joué sur un vrai GitLab.
- `node .githooks/pr-watch.mjs` suit la CI de la branche principale et écrit la preuve
  (`.drwil/evidence/main-ci.json` (si présent)). Éprouvé une fois en vrai le 2026-11-06 sur la PR #366
  (commit de fusion `4acc3d1`, CI verte, preuve écrite) ; le cas rouge n'a jamais été joué en vrai.
- Hors GitHub, le verrou de QUA-251 ne s'applique pas (décision du demandeur du 2026-11-06) : la
  file passe et le dit, la CI de la branche principale se vérifie à la main.

**Suite livrée (2026-11-09)** :

Le chantier « les contrôles lents sont accélérés par la CI livrée » (voir `docs/projects/journal.md`) a ajouté le
réglage `shards: N` (tranches parallèles GitHub et GitLab) et la reprise d'un verdict de PR d'un push à l'autre
(QUA-288 à QUA-291), prouvés par un projet d'essai synthétique. Restent ouverts ici : la mesure réelle d'un gain
(sur un projet adoptant) et l'essai sur un vrai GitLab.

## Questions à trancher

- [décision] Mener ces essais au fil des développements du demandeur, ou les grouper avant une publication (0.12.0) ?

### la fusion automatique ordonnée éprouvée sur une vraie PR en retard (ex-« merge-auto-eprouve-en-reel »)

- [décision] Jouer l'outil à la première PR réelle en retard sur `master` (la prochaine clôture avec fusion automatique), et noter ici ce que `gh` répond vraiment (délai du recalcul de l'état après la mise à jour) ; ajuster le délai par défaut de 5 minutes si besoin.

### la lecture de la CI d'une MR GitLab et la CI GitLab du gabarit, éprouvées en réel (ex-« gitlab-ci-de-la-mr-essai-reel »)

- [humain] Un essai réel sur un projet GitLab (MR ouverte, contrôle `["ci"]`, CI verte puis rouge) : quand, et sur quel projet ?
- [décision] Un défaut vu à l'essai ouvre une fiche de correction ; faut-il un essai avant la prochaine publication ?

### prouver `start` vers un worktree dans un vrai terminal (ex-« start-worktree-en-vrai-terminal »)

- Un pseudo-terminal portable (Linux, macOS, Windows) est-il disponible sans dépendance lourde ?
- Faut-il plutôt un essai réel attesté, une fois par version ?

### l'enchaînement des lots éprouvé sur une vraie fiche à lots (ex-« essai-reel-lots-en-sous-agents »)

- [décision] Mener la prochaine fiche à lots avec l'enchaînement et mesurer sa consommation avant d'en faire la règle de tout chantier à lots ?

### essais réels de l'attestation depuis la conversation (ex-« attestation-chat-essais-reels »)

- [humain] Dater dans la matrice le premier essai réel de chaque outil, au fil des développements du demandeur.
- [décision] Un défaut vu à l'usage ouvre une fiche de correction ; faut-il aussi un essai dédié par outil avant
  la 0.12.0, ou l'usage suffit-il ?
- [décision] Cursor : garder le client ACP dédié ou attendre un canal natif du chat habituel ?

### la CI rapide éprouvée en réel, et la preuve de CI de la branche principale hors GitHub (ex-« ci-rapide-epreuves-reelles »)

- [IA] Mesurer une PR de doc après la fusion de ce chantier (durée de l'ouverture à la fusion, contrôles repris).
- [IA] Éprouver la preuve de CI de la branche principale sur une vraie fusion rouge (la verte l'est : PR #366).
- [décision] Éprouver la reprise GitLab par `CI_JOB_TOKEN` sur un vrai GitLab (projet d'essai à choisir).
- [décision] Parité GitLab de `pr-watch` et `merge-auto` (élargi par le demandeur le 2026-11-06) :
  aujourd'hui les deux ne parlent qu'à GitHub (`gh`). Porter sur les merge requests GitLab le suivi
  de la CI, la fusion programmée, le suivi de la CI de la branche principale après la fusion et
  l'issue d'alerte (déjà ouverte par le job `alert-if-ci-broken` du gabarit GitLab), pour que la
  fusion automatique et le verrou de QUA-251 y valent aussi (`glab` ou API v4, à trancher).
