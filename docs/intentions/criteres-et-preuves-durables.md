# Intention : des critères et des preuves qui survivent à la clôture

**Statut** : couverte le 2026-10-21 par le chantier du même nom (journal) ; ce
qui reste ouvert tient dans deux intentions filles,
`docs/intentions/nom-du-dossier-des-preuves.md` et
`docs/intentions/preuve-des-chantiers-deja-clos.md`.

Proposée le 2026-10-17 — retour d'expérience de `drwil_com`
(rapport « docs/experiments/acceptance-criteria-report.md » de ce dépôt,
écarts 1 et 3), priorité 2 du demandeur.

## Besoin

Les critères d'acceptation ne sont évalués que pour la fiche active, lue
dans `.drwil/state.json` (si présent), un état local ignoré par git : ils ne sont pas
rejoués en CI et disparaissent de la vérification quand la clôture
supprime la fiche. Les résultats d'exécution (`verify-*.json`,
`criteria-*.md`) sont ignorés par git : la trace d'une exécution n'existe
que dans les journaux de CI.

Résultat attendu : une trace durable de ce qui a été demandé, accepté,
vérifié et prouvé, même après la clôture — sans versionner chaque
exécution si cela crée du bruit sans gain d'auditabilité.

## Existant (vérifié le 2026-10-17)

- `packages/drwil/src/criteria.ts` (`activeBrief`) lit la fiche nommée
  par `.drwil/state.json` (si présent) ; `verify` ne juge les critères que si elle
  existe.
- Un critère n'a pas d'ID propre : texte + ID de contrat en fin de ligne
  (`check-docs`). Le contrat, lui, est durable et rejoué partout.
- `packages/drwil/src/evidence.ts` écrit `.drwil/evidence/verify-<horodatage>.json`
  (hors git) ; le gabarit `.gitignore` n'en garde que
  `.drwil/evidence/attestations/`.
- La clôture condense la fiche dans `docs/projects/journal.md` (prose) et
  la supprime.

## Pistes (à trancher, non exclusives)

1. **Critères gardés à la clôture** : la condensation au journal garde
   chaque critère et son lien (contrat, contrôle, test), sous une forme
   lisible par une machine.
2. **Critères rejoués en CI** : la branche d'un chantier porte sa fiche
   (trailer `Drwil-Brief`, déjà écrit sur les commits) ; la CI juge les
   critères de cette fiche sans état local.
3. **Preuve de clôture versionnée** : un seul fichier par chantier, écrit
   au commit de clôture (verdict, critères, contrats, contrôles, commit
   vérifié), plutôt qu'une trace par exécution.

## Ce que prouve chaque piste (demandeur, 2026-10-17)

Les trois pistes sont complémentaires mais ne prouvent pas la même
chose :

- **garder les critères** : savoir ce qui devait être satisfait ;
- **rejouer les critères en CI** : vérifier à nouveau les exigences ;
- **garder une preuve de clôture** : retracer le résultat d'un chantier
  terminé.

La fiche devra dire comment ces éléments se référencent mutuellement, et
comment empêcher qu'un critère soit déclaré satisfait alors que sa preuve
n'existe plus.

## Critères d'acceptation candidats

- Après la clôture d'une fiche, ses critères et leurs liens restent
  lisibles dans le dépôt, et un contrôle vérifie qu'ils pointent vers des
  contrats existants.
- En CI, les critères de la fiche du chantier sont jugés sans
  `.drwil/state.json` (si présent).
- Une preuve absente, périmée ou non exécutée n'est jamais comptée comme
  un succès, en local comme en CI (QUA-013, un contrôle non exécuté n'est
  pas passé, étendu aux critères).

## Tests prévus

Clôture d'une fiche puis relecture de ses critères ; `verify` en CI sans
état local sur une branche de chantier ; preuve de clôture absente ou
désaccordée avec le commit.

## Doc à changer

Recette de clôture, `docs/ia-first.md` (cycle), README (ce qui reste après
un chantier), changelog.

## Questions à trancher

Aucune : toutes tranchées par le demandeur le 2026-10-21, détail dans
`docs/projects/journal.md` : les trois pistes retenues,
unifiées par un fichier de preuve de clôture par chantier ; une preuve disparue
fait échouer franchement, même code en local et en CI ; un fichier par chantier
cité par le journal ; pas d'identifiant propre pour un critère (contrat et
chantier) ; la preuve de clôture porte l'empreinte des fichiers couverts.
