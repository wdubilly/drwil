# Intention : un push depuis un worktree ne touche jamais le vrai dépôt

**Statut** : proposée le 2026-10-18 après un incident constaté par l'agent
pendant le cadrage de la 0.6.6 ; priorité à décider par le demandeur
(proposée par l'agent avant la 0.6.6).

## Besoin

Un `git push` depuis un worktree secondaire (`git worktree add`) lance au
pre-push la suite complète des contrôles. Le 2026-10-18, cette suite a agi
sur le **vrai dépôt** au lieu de ses dépôts temporaires : `core.bare=true`
écrit dans la configuration commune (le dépôt principal n'avait plus
d'arbre de travail, alors qu'un sous-agent y menait un chantier), branche
parasite `workstream/kit-installation` créée et extraite dans le worktree,
index du worktree rempli de suppressions. Réparé à la main
(`git config core.bare false`, worktree remis sur son commit, branche
supprimée) ; rien n'a été poussé, aucun commit n'a été perdu.

C'est une **régression** du correctif du 2026-10-10 (journal, « Tests des
contrôles isolés des variables GIT_* du hook », PR #16), qui décrivait le
même symptôme (`core.bare=true` écrit dans le vrai dépôt depuis un
worktree).

## Existant (vérifié le 2026-10-18)

- `packages/drwil/test/kit.test.mjs` retire toutes les variables `GIT_*`
  de `process.env` en tête de fichier ; ce n'est pas vérifié pour les
  fichiers de test ajoutés depuis (hooks, `outils/`, `.github/scripts/`).
- Le test de non-régression du 2026-10-10 rejoue les tests avec `GIT_DIR`
  et `GIT_INDEX_FILE` pointés vers un dépôt « victime » ; il n'a pas
  détecté ce cas.
- Pendant l'incident, le pre-push a aussi échoué en masse (citations,
  carte, miroirs, liens contrat ↔ test), comme si les contrôles lisaient
  un autre arbre que le worktree.
- Cause précise : **non établie** (fichier de test sans retrait des
  `GIT_*`, test lancé avec le dossier courant du dépôt, ou variable non
  couverte comme `GIT_COMMON_DIR`).

## Questions à trancher

- [décision] Priorité : un chantier avant la 0.6.6 (recommandé par
  l'agent : un simple push peut abîmer le dépôt et casser un chantier en
  cours), ou dans la 0.6.6 ?
- [décision] Garde-fou : retrait des `GIT_*` imposé à tout fichier de test
  par un contrôle, ou isolation centralisée (le lanceur des contrôles
  nettoie l'environnement de ses enfants) ?

## Piste de preuve

Rejouer l'incident : créer un worktree d'un dépôt jetable, y lancer le
pre-push, vérifier que le dépôt principal (configuration, branches, index)
reste identique.
