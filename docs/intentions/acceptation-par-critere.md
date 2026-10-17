# Intention : une acceptation humaine par critère, distincte du texte de l'agent

**Statut** : proposée le 2026-10-17 — retour d'expérience de `drwil_com`
(rapport « docs/experiments/acceptance-criteria-report.md » de ce dépôt,
écart 2), à examiner après les intentions sur les attestations et la
durabilité des critères.

## Besoin

Le kit distingue deux gestes humains : le lancement d'une fiche entière et
l'attestation d'un contrat `Manual`. Rien n'enregistre la décision du
demandeur **critère par critère** : « critères validés par le demandeur »
est une phrase écrite par l'agent dans la fiche, qui ne vaut pas preuve.

Distinguer sans les confondre :

- l'acceptation du besoin (les critères sont les bons) ;
- l'attestation humaine d'un contrat ;
- la preuve automatisée d'un comportement ;
- l'identité de la personne qui a agi.

## Existant (vérifié le 2026-10-17)

- Lancement : réponse au sondage lue par un hook, ou `node
  .githooks/state.mjs start` en terminal interactif (QUA-037, une file de
  chantiers décidée d'un geste) ; il vaut acceptation de la fiche entière.
- `drwil attest` : par contrat, identité `git config user.name`
  (déclarative).
- Intentions voisines : `docs/intentions/vue-de-relecture.md` (montrer ce
  qui demande le jugement humain), `docs/intentions/fluidite-sans-perte-de-rigueur.md`
  (afficher qui décide chaque transition), `docs/intentions/forge-dans-le-livrable.md`
  (identité distincte de l'agent).

## Questions à trancher

- [décision] Le lancement par sondage suffit-il comme acceptation des
  critères, s'il enregistre l'empreinte des critères acceptés (un critère
  modifié ensuite redemande un geste) ? Ou faut-il un geste par critère ?
- [décision] Où enregistrer l'acceptation : dans l'état local, dans un
  fichier versionné écrit par l'outil (jamais par l'agent), ou dans la
  preuve de clôture ?
- [décision] Identité : rester déclarative (`git config`) tant que
  l'agent n'a pas d'identité distincte, ou attendre la forge ?
- [décision] Le réévaluer après les décisions sur les attestations et la
  durabilité des critères (ordre proposé par le demandeur) ?
