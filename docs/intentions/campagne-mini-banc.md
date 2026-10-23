# Intention : lancer la campagne du mini-banc et lire ses chiffres

**Statut** (2026-10-23) : le banc rejouable est livré (fiche `docs/projects/mini-banc.md`,
lot 1, sur `workstream/mini-banc`). Restent le passage d'essai réel en CI, la
campagne de 12 passages et la lecture des chiffres.

**Projet** : DRWIL — **Niveau de risque** : HIGH (un agent tourne sans surveillance,
avec le jeton d'abonnement, et le workflow touche `.github/`).

**Intention d'origine** : `docs/intentions/bench-avec-sans-drwil.md`.

## Besoin

Savoir si drwil améliore le livrable d'un agent et ce qu'il coûte en tokens,
sur le mini-banc (2 tâches, 3 répétitions, avec et sans drwil : 12 passages),
avant de construire la fabrique autonome.

## Ce qui reste, dans l'ordre

1. **Essai réel en CI** [humain] : `claude setup-token`, puis
   `gh secret set CLAUDE_CODE_OAUTH_TOKEN`, puis
   `gh workflow run banc.yml -f essai=true -f modele=<identifiant complet>`.
   Il doit aller au bout. C'est aussi ce qui confirme le format JSON de
   `claude -p` (`stream-json`, `usage`, `num_turns`, `total_cost_usd`,
   `error_max_turns`) et l'option `--max-turns`, vérifiés seulement en simulation.
2. **Budget** [humain] : écrit au protocole après l'essai, ce qui le re-date
   (QUA-106 exige un protocole daté avant la première mesure).
3. **Campagne** [humain] : 12 passages par `.github/workflows/banc.yml`, en `max-parallel: 2`
   pour ménager le quota de l'abonnement. Le coût en dollars de la sortie JSON
   est une estimation, pas une facture.
4. **Rapport** : `node outils/banc.mjs rapport`, daté à côté du protocole, tous
   les passages rapportés, min et max, aucun relancé.
5. **Lecture** [décision] : ce que les chiffres changent à la feuille de route
   (fluidité, fabrique, banc complet).

## Limites connues

- Le passage d'essai réel n'a jamais été lancé : le workflow n'est testé qu'en simulation.
- `.github/workflows/banc.yml` n'existe que sur `workstream/mini-banc` tant que le lot 1 n'est pas
  fusionné ; l'essai se lance donc après fusion (ou avec `--ref`).
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

- [décision] Faut-il lancer l'essai réel avant la fusion du lot 1, en `--ref workstream/mini-banc`, plutôt qu'après ?
- [décision] Budget de la campagne : fixé après l'essai, à écrire au protocole.
