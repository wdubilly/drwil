# Intention : un cadrage complet du premier coup, un élargissement sans friction

**Statut** : proposée le 2026-10-15 — retour d'expérience du chantier
« capitaliser les non-régressions » (journal du 2026-10-15).

## Besoin

Le cadrage de ce chantier a dû être élargi cinq fois en cours de route :
il listait les fichiers du gabarit (`packages/drwil/templates/`) mais ni
leurs copies du dépôt (`.githooks/*.mjs`, `docs/recipes/*.md`), ni le test
de chaque fichier, ni le modèle de fiche du gabarit (du Markdown sous
`packages/` compte comme du code). Chaque élargissement exige un commit qui
ne touche que la fiche ; or le hook de commit teste tout l'arbre de travail,
donc le lot en cours devait être mis de côté (`git stash`) le temps du
commit. Rien de contourné, mais une friction répétée.

## Existant

Relevé le 2026-10-15 :
- `.githooks/scope-gate.mjs` refuse un fichier hors du bloc `scope` de la
  fiche lue dans HEAD ; l'élargissement passe par un commit séparé.
- `outils/miroirs.json` et `outils/installer-depot.mjs` savent déjà quel
  fichier du dépôt est la copie de quel fichier du gabarit.
- Les tests des contrôles (`.githooks/*.test.mjs`) tournent sur l'arbre de
  travail à chaque commit.

## Décisions

Tranchées par le demandeur le 2026-10-16 (sondage), cadrées dans
`docs/projects/cadrage-complet.md`, en `[P1]` : un fichier du gabarit
cadré couvre sa copie (réglage de correspondance) ; un contrôle au cadrage
avertit des oublis (code sans test, contrat créé sans la configuration des
contrôles) ; un commit de fiche seule ne rejoue que ce qu'il indexe.

## Questions à trancher

Aucune (voir « Décisions »).

## Questions d'origine

- [décision] Le cadrage d'un fichier du gabarit vaut-il pour sa copie du
  dépôt (déduite de `outils/miroirs.json`), sans la lister ?
- [décision] Un commit qui ne touche que la fiche doit-il tester l'arbre
  entier, ou seulement ce qu'il indexe ?
- [décision] Le modèle de fiche doit-il rappeler de lister les tests ?
