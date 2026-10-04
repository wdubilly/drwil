# Intention : Packager un skill de découverte de valeur produit

**Statut** (2026-10-04) : cadré — prêt à implémenter.

## Besoin
Fournir dans le kit un second skill/recette d'analyse, complémentaire à
`auditer-risques-et-dette` (risques/dette), qui identifie les
fonctionnalités à forte valeur métier les plus pertinentes à développer
ensuite, en s'appuyant sur ce qui existe déjà dans le code et les fiches de
cadrage.

## Existant
- Second prompt fourni par le demandeur (voir historique de session),
  rédigé pour la même structure de projet spécifique (un éventuel
  docs/01-intentions.md, docs/02-cadrage.md, dossier src/, dossier tests/)
  que le premier prompt d'audit de risques.
- Skill `auditer-risques-et-dette` déjà packagé dans cette session, avec
  les mêmes décisions de généricité à reprendre à l'identique :
  localisation des entrées via `.drwil/ia-first.json` plutôt que des
  chemins en dur, fiche de sortie sans préfixe numérique, pas de module
  .mjs (jugement nécessaire, pas mécanisable).

## Questions à trancher
(résolu — voir « Décisions prises » ci-dessous, reprises du skill
`auditer-risques-et-dette` pour rester cohérent)

## Décisions prises (2026-10-04)
1. **Généricité** : même principe que l'audit de risques — lire
   `.drwil/ia-first.json` (`dirs.*`) pour localiser les fiches réelles
   (`docs/intentions/`, `docs/projets/`) plutôt que des chemins en dur.
2. **Nom de la fiche de sortie** : docs/decouverte-valeur.md (à créer —
   convention drwil, pas de préfixe numérique).
3. **Portée** : lecture + proposition uniquement. « Valide OPT-X » doit
   déboucher sur la création d'une fiche d'intention (`dirs.intentions`),
   jamais sur du code direct (cohérent avec QUA-016 et avec le
   fonctionnement du skill d'audit).
4. **Script ou prompt pur** : pas de module .mjs — recette + skill qui
   cadrent la méthode (analyse de valeur = jugement produit, pas
   mécanisable).

## Périmètre
- `docs/recettes/decouvrir-valeur-produit.md` (FR) et son équivalent
  anglais : méthode détaillée —
  localiser la vision/le cadrage existant (`dirs.intentions`,
  `dirs.projects`), le code des couches déclarées (`layers`), évaluer
  chaque opportunité (Valeur métier / Proximité technique-effort /
  Alignement produit), produire/mettre à jour docs/decouverte-valeur.md au
  format tableau OPT-N + analyse détaillée des meilleures pistes +
  prochaine étape.
- `.claude/skills/decouvrir-valeur-produit/SKILL.md` (FR) et son
  équivalent anglais : pointeurs courts.

## Hors périmètre
- Création automatique de la fiche d'intention correspondant à une
  opportunité validée (l'utilisateur garde la main, comme pour
  « Corrige RSK-X »).
- Intégration en CI (déclenché à la main, comme le tableau de bord et
  l'audit de risques).

## Critères de sortie
- Recette + skill livrés dans les templates du kit (FR et EN).
- Testé sur drwil lui-même : skill invoqué, docs/decouverte-valeur.md
  généré avec des opportunités réelles (sourcées, pas inventées).
- `.githooks/check-docs.mjs` et tests du kit toujours verts.
