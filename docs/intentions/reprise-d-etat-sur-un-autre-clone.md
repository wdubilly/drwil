# Intention : reprendre un chantier sur une autre machine sans rester bloqué par l'état local

**Statut** : proposée le 2026-11-05 — demande du demandeur, bloquante : reprise d'un chantier sur une autre
machine ou un clone neuf ; cause relevée dans le code le même jour (lecture seule, non reproduite par un test).

**Revu le 2026-11-05** : cadrée le jour même en fiche, `docs/projects/reprise-d-etat-sur-un-autre-clone.md`
(commande `resume` de l'agent, BUILD ou CLOSING, trailer `Drwil-Lot`, état non versionné) ; questions tranchées.

## Besoin

L'état de gouvernance (`.drwil/state.json` (si présent), ignoré par Git) est propre à un dossier. Quand un chantier a
avancé sur une autre machine ou dans un autre clone, la branche `workstream/<fiche>` et ses commits arrivent
par GitHub, mais pas l'état : il est absent (état neutre, SCOPING) ou resté sur un état ancien. Le
demandeur est alors bloqué :

- le commit est refusé : la barrière de périmètre juge depuis SCOPING, tout fichier de code est hors fiche ;
- le lancement est refusé ;
- aucune commande ne remet l'état d'accord avec la branche, et écrire l'état à la main est interdit.

Besoin : reprendre le chantier là où il en est, d'un geste, sans contourner la gouvernance.

## Existant (relevé le 2026-11-05)

- `.githooks/state-transitions.mjs`, `prepareBranch` : depuis une autre branche que `workstream/<fiche>`,
  le lancement est refusé si la branche locale existe déjà (« la branche … existe déjà ; s'y placer pour
  reprendre le chantier ») ; placé sur la branche du chantier, l'étape passe.
- `.githooks/state-transitions.mjs`, `start` : un chantier en CLOSING dont la fiche est déjà supprimée sur la
  branche ne peut pas être relancé (la fiche n'est plus là) ; aucun autre chemin ne mène à CLOSING.
- `.githooks/state-validate.mjs` : l'état local porte aussi des décisions humaines (`auto_merge`, `queue`,
  `queue_merge`, `reopened`) ; `.githooks/state-lots.mjs` garde le lot en cours dans un fichier local
  (.drwil/lot.json, chez le projet) : tout est perdu avec le dossier.
- Les commits d'un chantier portent le trailer `Drwil-Brief` (fiche active), et la clôture écrit sa preuve
  dans `docs/preuves/` : l'historique Git dit déjà sur quelle fiche on travaillait et si elle est close.

## Piste

Une reprise depuis Git (`node .githooks/state.mjs resume`, ou reconnue par `start` sur la branche du
chantier) reconstruit ce que l'historique prouve : branche `workstream/<fiche>` et fiche présente → BUILD
sur cette fiche ; fiche supprimée par un commit de clôture, PR ouverte → CLOSING ; lot courant déduit des
commits. Les décisions humaines (fusion automatique, file) ne sont jamais reconstruites : redemandées.

## Questions à trancher

- [décision] Geste : une commande `resume` de l'agent (l'historique prouve l'état, aucune décision n'est
  prise), ou un sondage humain comme le lancement ?
- [décision] Reconstruire seulement BUILD, ou aussi EVIDENCE, VERIFY et CLOSING (la preuve de verify est
  locale, `.drwil/evidence/` : reprendre en BUILD et rejouer verify suffit-il) ?
- [décision] Le lot courant : déduit des commits (trailer à ajouter ?), ou redemandé ?
- [décision] Garder l'état sur GitHub (fichier versionné sur la branche du chantier) plutôt que le
  reconstruire ? Écarte-t-il le risque d'un état écrit à la main ?
- [décision] Contrat : un nouveau contrat (« un chantier se reprend sur un clone neuf, d'un geste »), prouvé
  par un test qui clone le dépôt d'un chantier en cours et reprend.
