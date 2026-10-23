# Intention : lancer la campagne du mini-banc et lire ses chiffres

**Statut** (2026-10-23) : le banc rejouable est livré (journal `docs/projects/journal.md`,
lot 1, branche `workstream/mini-banc`), puis le déroulé de session conservé et la
copie « avec drwil » installée comme chez un utilisateur (journal, « Mini-banc :
déroulé conservé et copie réaliste », QUA-107 et QUA-108), enfin le banc prêt
pour l'essai réel (journal, « Mini-banc prêt pour l'essai réel » : test de
QUA-108 fidèle à l'agent, gitleaks dans le job de passage, QUA-109). L'essai
réel peut se lancer dès la fusion de la PR #210. Restent le passage d'essai
réel en CI, la campagne de 12 passages et la lecture des chiffres.

**Projet** : DRWIL — **Niveau de risque** : HIGH (un agent tourne sans surveillance,
avec le jeton d'abonnement, et le workflow touche `.github/`).

**Intention d'origine** : `docs/intentions/bench-avec-sans-drwil.md`.

## Besoin

Savoir si drwil améliore le livrable d'un agent et ce qu'il coûte en tokens,
sur le mini-banc (2 tâches, 3 répétitions, avec et sans drwil : 12 passages),
avant de construire la fabrique autonome.

## Ce qui reste, dans l'ordre

**Ordre décidé le 2026-10-23** (demandeur) : d'abord régler l'adoption
(`docs/intentions/premier-commit-avant-adoption.md`), puis relire
`docs/projects/banc-copie-adoptee.md` à la lumière de cette décision (la
copie adoptée peut s'en trouver simplifiée), la réaliser, puis un nouveau
passage d'essai réel. Le second essai (run 39966784905) a tourné de bout en
bout, verdict « raté » : l'agent a buté sur la dette d'un `init` sans
adoption.

1. **Essai réel en CI** [humain], maintenant que le déroulé de session est
   conservé (journal du 2026-10-23, QUA-107) : le secret `CLAUDE_CODE_OAUTH_TOKEN` est
   enregistré (2026-10-23) ; après la fusion de la PR #210,
   `gh workflow run banc.yml -f essai=true -f modele=<identifiant complet>`.
   Il doit aller au bout. C'est aussi ce qui confirme le format JSON de
   `claude -p` (`stream-json`, `usage`, `num_turns`, `total_cost_usd`,
   `error_max_turns`) et l'option `--max-turns`, vérifiés seulement en simulation.
   Lire le déroulé (`<tâche>-<condition>-<rép>.jsonl` de l'artefact) : lancement
   du chantier, blocages et leur cause. gitleaks est installé dans le job
   de passage (QUA-109) : l'agent « avec » peut pousser.
2. **Budget** [humain] : écrit au protocole après l'essai, ce qui le re-date
   (QUA-106 exige un protocole daté avant la première mesure).
3. **Campagne** [humain] : 12 passages par `.github/workflows/banc.yml`, en `max-parallel: 2`
   pour ménager le quota de l'abonnement. Le coût en dollars de la sortie JSON
   est une estimation, pas une facture.
4. **Rapport** : `node outils/banc.mjs rapport`, daté à côté du protocole, tous
   les passages rapportés, min et max, aucun relancé. Rendre alors à QUA-106
   (rapport du mini-banc) sa ligne **Manuel**, retirée le 2026-10-23 pour
   pouvoir fusionner le lot 1 : vérifier que le rapport rapporte les 12
   passages, aucun relancé, sur un protocole daté avant le premier passage.
5. **Lecture** [décision] : ce que les chiffres changent à la feuille de route
   (fluidité, fabrique, banc complet).

## Limites connues

- Le passage d'essai réel n'a jamais été lancé : le workflow n'est testé qu'en simulation.
- GitHub ne déclenche à la main (`workflow_dispatch`) qu'un workflow présent sur la
  branche principale : l'essai se lance après la fusion du lot 1, jamais avant (`--ref` seul ne suffit pas).
- Un agent déterminé pourrait chercher les tests cachés sur le dépôt public :
  `--isoler` le rend difficile, sans l'empêcher (écrit au protocole).
- Le juge ne relit pas le compte rendu de l'agent : l'« annonce sans preuve » reste jugée à la main.
- Défaut préalable : le test QUA-060 (un outil n'est tenu que prouvé par le banc)
  de `outils/banc-agents.test.mjs` laisse un dossier vide `drwil-banc-*` à la racine
  à chaque lancement (472 aujourd'hui, non suivis). Hors de ce chantier : à corriger par un détour.

## Existant

Relevé le 2026-10-23 : `outils/banc.mjs`, `outils/banc-juge.mjs`,
`bench/reference/` (panier avec le bug des quantités), `bench/taches/` (bug et
piège) et `.github/workflows/banc.yml` (à la demande, `max-parallel: 2`) existent
sur `workstream/mini-banc`, tests verts avec un agent simulé. Aucun passage réel n'a été lancé.

## Questions à trancher

- [décision] Budget de la campagne : fixé après l'essai, à écrire au protocole.
