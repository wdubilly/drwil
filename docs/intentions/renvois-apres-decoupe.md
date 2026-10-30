# Intention : des renvois justes après la découpe de `docs/ia-first.md`, et une recette livrée à jour

**Statut** : proposée le 2026-10-30 — cinq notes de `docs/intentions/notes.md` (2026-10-29) promues sur
décision du demandeur ; restes du chantier qui a découpé `docs/ia-first.md` en sections courtes (QUA-190).
Cadrée le 2026-10-30 en fiche : `docs/projects/renvois-apres-decoupe.md` (questions tranchées, voir sa section
Décisions).

## Besoin

La découpe de `docs/ia-first.md` en fichiers de `docs/ia-first/` a laissé des renvois qui ne mènent plus
directement à leur cible. Un agent qui charge une section seule doit pouvoir suivre chaque renvoi sans lire
les autres. Notes d'origine :

1. Le commentaire de `.githooks/scope-gate.mjs` (gabarit et copie) cite la section « Scope gate » de
   `docs/ia-first.md`, qui s'appelle « Scope barrier » : renvoi mort antérieur à la découpe.
2. Le test des renvois (QUA-190) ne vérifie les titres cités que dans les documents Markdown, pas dans les hooks : le
   renvoi mort du point 1 passe.
3. Des renvois internes (« see below », « section 8 of this document »…) ne mènent plus directement à leur
   cible quand une section est lue seule ; les réécrire vers le fichier exact.
4. Le champ **Couvre** de QUA-063 vise encore `docs/ia-first.md`, alors que la matrice de compatibilité est
   dans `docs/ia-first/6-limits-and-tool-compatibility.md`.

Même nature, ajouté à cette intention (note du 2026-10-29) :

5. La recette livrée `packages/drwil/templates/common/base/docs/recipes/working-with-branches.md` n'a pas la puce « This folder » (QUA-179 : branche
   créée au lancement) que porte la copie du dépôt : un projet installé ne l'apprend pas par la recette.
   Constaté à la clôture de fin-de-cadrage-sondage.

## Existant (relevé le 2026-10-30)

- `.githooks/scope-gate.mjs:2` et `packages/drwil/templates/common/base/.githooks/scope-gate.mjs:2` :
  `// Scope gate (docs/ia-first.md, "Scope gate")` ; la section s'appelle « Scope barrier »
  (`docs/ia-first/7-scope-barrier.md`).
- Renvois relatifs dans les sections (gabarit et copie) : `1-single-entry-point.md:12` (« section 8 of this
  document »), `7-scope-barrier.md:43` (« see below »), `7-starting-and-closing.md:7`, `:33`, `:69`
  (« below », « above »), `7-governance-state.md:42` (« "Starting and closing" below », qui est désormais
  un autre fichier). Certains visent leur propre fichier et restent justes : à trier.
- QUA-063 : `**Couvre** : docs/ia-first.md`.
- QUA-190, test `packages/drwil/test/kit.test.mjs` : résout les renvois des documents ; aucun test ne lit
  les titres cités dans un commentaire de hook.
- `docs/recipes/working-with-branches.md:21` porte la puce « At `/drwil-start` in "This folder" » (neuf
  lignes) ; `packages/drwil/templates/common/base/docs/recipes/working-with-branches.md` ne l'a pas.
  `outils/miroirs.json` déclare pour ce fichier deux phrases propres au dépôt (checks imposés côté forge,
  installation depuis le gabarit), pas cette puce : l'écart passe le contrôle `miroirs-gabarit`, qui ne
  voit donc pas un ajout fait dans la copie au lieu du gabarit.

## Questions à trancher

- [décision] Livrable et dépôt : tout se corrige dans le gabarit, puis s'installe (`npm run
  installer-depot`) ; QUA-063 est un contrat du dépôt. Confirmer.
- [décision] Étendre QUA-190 (titres cités dans les commentaires des hooks livrés résolus), ou un contrat
  neuf ? Les renvois relatifs (« below », « above ») qui sortent du fichier sont-ils refusés par un test, ou
  seulement réécrits une fois ?
- [décision] `miroirs-gabarit` : un écart déclaré pour un fichier couvre aujourd'hui toute différence. Le
  resserrer (comparer aux seules phrases déclarées) dans ce chantier, ou en faire une intention séparée ?
