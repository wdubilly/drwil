# Intention : Packager un skill d'audit de risques et dette technique

**Statut** (2026-10-04) : cadré — prêt à implémenter.

## Besoin
Fournir dans le kit (`@drwil/kit-ia-first`) un skill/recette réutilisable qui
déclenche un audit de santé du dépôt (dérive de spec, code mort, angles
morts de sécurité, trous de tests) et génère/maintient une fiche de synthèse
(docs/00-friction-and-risk.md ou équivalent générique), au même titre que
les recettes existantes (`visualiser-avancement`, `adopter-le-kit`, etc.).

## Existant
- Prompt d'audit fourni par le demandeur (voir historique de session),
  actuellement rédigé pour une structure **spécifique à un projet donné**
  (un éventuel docs/02-cadrage.md, docs/03-specs.md, dossier src/, dossier
  tests/), pas pour la structure générique du kit (fiches de
  docs/projets/, docs/contrats.md, dossier de code variable selon le
  projet).
- Skills existants du kit suivent le motif : `.claude/skills/<nom>/SKILL.md`
  (pointeur court) → `docs/recettes/<nom>.md` (recette détaillée) → module
  optionnel si script (ex. `templates/common/optional/tableau-de-bord/`).

## Questions à trancher
(résolu — voir « Décisions prises » ci-dessous)

## Décisions prises (2026-10-04)
1. **Généricité** : le skill lit `.drwil/ia-first.json` (`dirs.*`) pour
   localiser les fiches de cadrage/specs réelles du projet cible, plutôt que
   des chemins en dur (un docs/02-cadrage.md ou dossier src/ n'existent pas
   tels quels dans tous les projets).
2. **Nom de la fiche de sortie** : docs/audit-risques.md (à créer —
   convention drwil, pas de préfixe numérique type `00-`).
3. **Portée** : lecture + proposition uniquement. Un correctif (« Corrige
   RSK-X ») reste une action distincte, qui doit elle-même passer par une
   fiche de cadrage si elle touche du code (cohérent avec QUA-016) — à
   documenter explicitement dans la recette, pas d'automatisation de
   correctif sans fiche.
4. **Script ou prompt pur** : pas de module .mjs. Recette + skill qui
   cadrent la méthode pour l'IA (lecture de cadrage réel, code, tests —
   jugement nécessaire, peu scriptable mécaniquement contrairement au
   tableau de bord).

## Périmètre
- `docs/recettes/auditer-risques-et-dette.md` : méthode détaillée —
  localiser les fiches de cadrage/specs via `.drwil/ia-first.json`
  (`dirs.projects`, ou chemins déclarés par le projet), lire le code source
  et les tests réels, catégoriser (Spec Drift / Code Mort / Sécurité /
  Tests), produire/mettre à jour docs/audit-risques.md (à créer) au format
  tableau RSK-N + sections détaillées + prochaine étape.
- `.claude/skills/auditer-risques-et-dette/SKILL.md` : pointeur court vers
  la recette.
- Gabarit de sortie générique dans la recette (reprenant la structure du
  prompt original : synthèse tableau, focus par risque majeur, prochaine
  étape pour l'utilisateur).

## Hors périmètre
- Exécution automatique des correctifs proposés (RSK-X) sans fiche de
  cadrage dédiée.
- Intégration en CI (audit resterait déclenché à la main, comme le tableau
  de bord).

## Critères de sortie
- Recette + skill livrés dans les templates du kit (FR et EN) sous
  `docs/recettes/`/`.claude/skills/` (et équivalents anglais).
- Testé sur drwil lui-même : skill invoqué, docs/audit-risques.md généré
  avec des résultats cohérents (cadrage réel de drwil, pas de chemin en
  dur).
- `.githooks/check-docs.mjs` et tests du kit toujours verts.
