# Intention : une attestation tombe quand ce qu'elle couvre change

**Statut** : proposée le 2026-10-17 — retour d'expérience de `drwil_com`
(rapport « docs/experiments/acceptance-criteria-report.md » de ce dépôt,
scénario S6, écart 4), priorité 1 du demandeur.

## Besoin

Une attestation humaine reste `ATTESTED` après un changement de ce qu'elle
est censée couvrir. Dans `drwil_com`, l'ajout d'une dépendance laisse
SEC-006 (pas de dépendance vulnérable connue) attesté : le verdict peut
rester PASS alors que l'humain n'a jamais jugé l'état actuel.

Résultat attendu : une attestation est liée à l'objet réellement attesté ;
un changement qui la remet en cause exige un nouveau geste humain, et le
verdict ne peut pas rester PASS tant qu'il manque.

Consigne du demandeur : **définir la règle de validité avant de choisir le
mécanisme**.

## Existant (vérifié le 2026-10-17)

- `packages/drwil/src/verify.ts` : une attestation (version 2) porte
  l'empreinte de la partie humaine du contrat (règle, `Manual`, sévérité)
  et celle de la définition de chaque contrôle cité (`run`, `cwd`). Elle
  tombe en `MANUAL` si l'une change (scénario S5 de `drwil_com` : bien
  détecté).
- Rien ne lie l'attestation aux fichiers : le champ `**Scope**` d'un
  contrat est de la prose (« project dependencies »), pas une liste de
  chemins lisible par une machine.
- `drwil attest` (`packages/drwil/src/attest.ts`) : terminal interactif,
  identité déclarative (`git config user.name`).
- QUA-032 (une attestation ne coûte que le jugement demandé) : à préserver,
  une invalidation trop large ferait réattester sans raison.

## Reproduit dans ce dépôt (2026-10-18)

Deuxième cas, réel, hors `drwil_com` : QUA-013 (contrôle non exécuté
n'est pas passé), attesté le 2026-10-16 ; son critère [humain] « chaque
contrôle garde une couverture CI prouvée » a été réutilisé par le chantier
« Windows et macOS testés seulement quand une PR touche du code » (0.6.4,
journal du 2026-10-18), qui a changé `.github/workflows/ia-first.yml`
(job `matrice-os`, matrice de `kit-tests`). L'attestation est restée
`ATTESTED` ; le chantier a été clos sur `verify` PASS, avec « à
réattester » en limite. Le 2026-10-18, le demandeur lance
`drwil attest QUA-013` depuis un terminal :

```
relance de ci-coverage…
  ci-coverage : ok
relance de tests-qua-013…
  tests-qua-013 : ok
✗ QUA-013 a déjà une attestation valide (2026-10-16T10:58:07.792Z) : rien à attester
```

Deux constats :

1. Le défaut S6, reproduit : l'objet du jugement (le workflow de CI) a
   changé, ni le texte du contrat ni la définition de ses contrôles ;
   l'attestation ne tombe pas.
2. Un manque de plus : un humain qui **veut** réattester ne le peut pas.
   Aucune option de `drwil attest` ne renouvelle une attestation encore
   valide, et une limite de chantier qui dit « à réattester » ne peut pas
   être suivie.

Scénario de test pour la fiche : modifier un fichier couvert par QUA-013
(`.github/workflows/ia-first.yml`) sans toucher au contrat, puis
`verify` doit rendre `MANUAL` et nommer le fichier ; `drwil attest
QUA-013` doit alors l'accepter.

## Principe validé (demandeur, 2026-10-17)

« Une attestation n'est valide que tant que l'objet qu'elle atteste reste
conforme à l'état évalué. »

**Le mécanisme reste ouvert jusqu'à la fiche technique** : champ
`**Covers**`, `**Scope**` structuré, empreinte des fichiers ou commit de
référence ne sont pas approuvés. Ce que la fiche devra établir avant de
choisir :

- une **correspondance vérifiable** entre l'attestation, le contrat, sa
  preuve et les éléments réellement couverts : une liste de chemins ne
  suffit pas si ces chemins ne correspondent pas à la preuve et au
  contrat concernés ;
- le comportement pour un fichier couvert **supprimé, renommé ou
  ajouté**.

## Règle de validité proposée par l'agent (à examiner dans la fiche)

Une attestation reste valide tant que **ni le contrat, ni la preuve, ni
l'objet attesté** n'ont changé depuis le geste humain. L'objet attesté est
ce que le contrat déclare couvrir, en chemins (fichiers ou motifs).

- Change l'objet : modifier, ajouter ou supprimer un fichier couvert.
- Ne change pas l'objet : un fichier hors de la couverture, un
  changement de forme exclu explicitement (à décider : aucun au départ).
- Un contrat attestable **sans couverture déclarée** est signalé (il ne
  peut pas savoir quand tomber), sans tomber pour autant : compatibilité
  avec les attestations existantes.

## Critères d'acceptation candidats

- Un fichier couvert modifié sans toucher au contrat fait tomber
  l'attestation en `MANUAL` ; `verify` ne rend plus PASS et dit quel
  fichier a changé.
- Un fichier hors couverture modifié laisse l'attestation `ATTESTED`.
- Un contrat attestable sans couverture déclarée est signalé par
  `verify` et `doctor`.
- Une attestation de format ancien reste lisible ; sa première
  réattestation passe au nouveau format.

## Tests prévus

Reproduire S6 avant correction (test rouge), puis : fichier couvert
modifié, ajouté, supprimé ; fichier hors couverture ; contrat sans
couverture ; ancienne attestation.

## Doc à changer

Format du contrat (nouveau champ), recette d'attestation, `README.md` et
README du paquet (ce qu'une attestation garantit), changelog.

## Questions à trancher

Aucune : toutes tranchées par le demandeur le 2026-10-21, détail dans `docs/projects/journal.md` :
règle sur les chemins couverts (couverture absente signalée sans invalider) ;
champ `**Covers**` ; supprimé, renommé, ajouté font tomber l'attestation ;
empreinte du contenu, indépendante de git ; renouvellement par option de
`drwil attest` ; un changement de forme pur la fait tomber.
