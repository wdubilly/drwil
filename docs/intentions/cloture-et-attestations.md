# Intention : clôture, réouverture et attestations : ce qui reste

**Statut** : proposée le 2026-10-25 — regroupement de 10 intentions lors du ménage du 2026-10-25 ; chaque partie reprend l'une d'elles, avec son statut d'origine. Cadrée le 2026-10-26 en cinq fiches (voir « Cadrage du 2026-10-26 » ci-dessous) ; l'intention reste là tant que ces fiches ne sont pas closes.

## Besoin

Plusieurs chantiers sur le cycle des fiches (critères, clôture, file, réouverture, attestations, recette) ont laissé leurs limites en intentions séparées. Elles touchent la même mécanique, la vie d'une fiche de son lancement à sa preuve, et se cadrent ensemble, par lots vérifiables seuls.

### une acceptation humaine par critère, distincte du texte de l'agent (ex-« acceptation-par-critere »)

Statut d'origine : proposée le 2026-10-17 — retour d'expérience de `drwil_com` (rapport « docs/experiments/acceptance-criteria-report.md » de ce dépôt, écart 2), à examiner après les intentions sur les attestations et la durabilité des critères.

Le kit distingue deux gestes humains : le lancement d'une fiche entière et
l'attestation d'un contrat `Manual`. Rien n'enregistre la décision du
demandeur **critère par critère** : « critères validés par le demandeur »
est une phrase écrite par l'agent dans la fiche, qui ne vaut pas preuve.

Distinguer sans les confondre :

- l'acceptation du besoin (les critères sont les bons) ;
- l'attestation humaine d'un contrat ;
- la preuve automatisée d'un comportement ;
- l'identité de la personne qui a agi.

### un cycle de vie des fiches sans contournement (ex-« cycle-de-vie-des-fiches »)

Statut d'origine : proposée le 2026-10-17 — retour d'expérience de `drwil_com` (rapport « docs/experiments/acceptance-criteria-report.md » de ce dépôt, écart 6), à examiner après les intentions sur les attestations et la durabilité des critères.

Deux frictions constatées dans `drwil_com` :

1. Un critère doit citer un contrat déjà inscrit au registre, mais écrire
   le registre pendant le cadrage déclenche l'avertissement de périmètre.
2. La clôture supprime la fiche, alors que tout fichier de code doit
   rester couvert par le cadrage d'une fiche : `drwil_com` a dû créer une
   fiche de référence « docs/projects/delivered-code.md » (dans son dépôt).

Reproduit dans ce dépôt le 2026-10-17 (chantier « premier essai propre »,
journal du 2026-10-17) :

3. Créer un contrat en cours de chantier a demandé deux commits : la fiche
   élargie ne pouvait pas citer le nouvel ID (`check-docs` : « contrat
   absent de docs/contracts.md ») et le registre ne pouvait pas entrer
   dans le commit d'élargissement (qui ne touche que la fiche).
4. Un contrat mixte (`Contrôle` + `Manuel`, ici QUA-013, contrôle non
   exécuté n'est pas passé) compte comme humain : un critère prouvé par
   des tests ne peut pas s'y rattacher (« preuve non durable »), ce que
   rien ne signale au cadrage.

Contrainte du demandeur : réduire les contournements et les gestes
répétitifs **sans affaiblir les contrôles de périmètre**.

### l'arrêt d'une file et ses comptes rendus vérifiés par un contrôle (ex-« arret-de-file-verifie »)

Statut d'origine : proposée le 2026-10-16 — limite du chantier « Une file de chantiers décidée d'un geste » (journal du 2026-10-16).

Une file de chantiers (QUA-037) doit s'arrêter au premier chantier qui
demande un humain (attestation, FAIL non corrigé, CI rouge, décision) et
rendre un compte rendu à chaque clôture. Aujourd'hui ce sont des consignes
à l'agent (skill `/drwil-start`, recette de clôture, `AGENTS.md`) : la
mécanique empêche de lancer une fiche hors file, mais rien n'empêche
l'agent de lancer la suivante alors que la précédente n'est pas fusionnée.

### déclarer ce que couvrent les contrats attestés du dépôt (ex-« couverture-des-contrats-attestes »)

Statut d'origine : proposée le 2026-10-21 — limite du chantier « une attestation tombe quand ce qu'elle couvre change ».

Le champ `**Covers**` (`**Couvre**`) existe, mais aucun contrat attesté de ce
dépôt n'en déclare : `drwil verify` et `drwil doctor` les signalent, et leur
attestation ne tombera pas quand le code qu'elle juge change (le cas de
QUA-013, dont le workflow de CI a changé sans faire tomber l'attestation,
reste donc ouvert ici). Résultat attendu : chaque contrat attesté déclare les
chemins qu'il juge, et sa première réattestation (version 3) par l'humain
suit.

### une attestation ne doit pas tomber quand un contrôle change de forme sans changer d'effet (ex-« attestation-sur-l-effet-du-controle »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « accélérer la CI sans perte de qualité » (journal du 2026-10-24).

L'ajout de champs de compilation et de parallélisme (`build`, `needsBuild`) à
une centaine de contrôles de `.drwil/ia-first.json` a périmé six attestations
humaines (QUA-013, QUA-015, QUA-064, QUA-066, QUA-067, QUA-092), alors que
l'effet des contrôles n'avait pas changé. L'empreinte de la preuve devrait se
définir sur l'effet du contrôle (commande normalisée, tests visés) plutôt que
sur sa déclaration complète.

### corriger un défaut révélé après la clôture (ex-« defaut-revele-apres-la-cloture »)

Statut d'origine : proposée le 2026-10-21 — défaut de gouvernance vécu à la clôture du chantier « des critères et des preuves qui survivent à la clôture » ; première et troisième questions tranchées et livrées le 2026-10-24 (`node .githooks/state.mjs reopen`, QUA-116 à QUA-118 ; journal du 2026-10-24, « Rouvrir un chantier dont la PR révèle un défaut après la clôture ») ; reste ici la deuxième (attendre CodeQL avant la clôture).

Un défaut peut n'apparaître qu'après la clôture : l'analyse de code de la forge
(CodeQL) a signalé une expression régulière polynomiale dans
`packages/drwil/src/closure.ts` une fois la PR ouverte, et son fil de revue non
résolu a bloqué la fusion. À ce moment, l'agent n'a plus aucune voie pour
corriger une ligne de code : l'activité est CLOSING, la barrière de périmètre
n'accepte le code qu'en BUILD, et aucun chemin ne ramène en BUILD. Résultat
attendu : un défaut révélé après la clôture se corrige sans attendre un geste
humain de relance, ou l'outillage dit clairement pourquoi il l'exige.

### une réouverture refusée après l'annulation de la fusion automatique (ex-« reouverture-fusion-annulee-apres-echec »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « rouvrir un chantier dont la PR révèle un défaut après la clôture » (journal du 2026-10-24).

`node .githooks/state.mjs reopen` annule la fusion automatique avant tout
commit (une branche dont la fusion est programmée ne reçoit rien). Si le
commit de la fiche restaurée échoue ensuite (un hook pre-commit qui refuse,
par exemple), la réouverture est refusée, l'état reste en CLOSING, mais la
fusion automatique reste annulée : le message le dit (« à reprogrammer »),
rien ne la reprogramme.

### la réouverture éprouvée sur une vraie PR et sous Windows (ex-« reouverture-eprouvee-en-reel »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « rouvrir un chantier dont la PR révèle un défaut après la clôture » (journal du 2026-10-24).

La réouverture (QUA-116, un chantier clos dont la PR révèle un défaut se
rouvre sur sa branche) est prouvée par des tests à `gh` simulé : injecté dans
les tests des hooks, script du PATH dans le cycle complet de
`packages/drwil/test/cycle.test.mjs`, sauté sous Windows (un script du PATH
n'y est pas lancé sans shell). Elle n'a pas encore servi sur une vraie PR
GitHub, avec une vraie fusion automatique programmée puis annulée.

### le feu vert de publication enregistré par l'outil au lancement (ex-« feu-vert-publication-enregistre »)

Statut d'origine : proposée le 2026-10-18 — limite du chantier « date gardée et feu vert de publication » (journal du 2026-10-18, 0.6.5, 1 sur 4).

La recette de release permet désormais de donner le feu vert de
publication au lancement, en nommant la version, pour qu'une file menée
par sous-agents publie sans s'arrêter. Ce feu vert n'est qu'une phrase de
la demande, que l'agent qui orchestre transmet mot pour mot au sous-agent :
rien ne le garde si la session change, et rien ne l'efface une fois la
release faite.

### la dernière version d'une fiche fusionnée par squash dans la fiche de recette (ex-« fiche-recette-apres-squash »)

Statut d'origine : proposée le 2026-10-19 — limite du chantier « une fiche de recette juste, leçons de la 0.6.5 » (journal du 2026-10-19, 0.6.6, 4 sur 4).

La fiche de recette (QUA-052, la fiche dit quoi valider, puis ce que la
non-régression a prouvé) lit chaque fiche de chantier juste avant le
commit qui l'a supprimée. Avec une fusion classique, c'est un commit de la
branche du chantier : la dernière version. Avec une fusion par squash, le
commit qui la supprime est le squash lui-même, posé sur la branche
principale : son parent garde la version du cadrage, et les critères
corrigés ou rattachés pendant le chantier n'apparaissent pas corrigés.

### Notes reprises de `docs/intentions/notes.md`

- 2026-10-23 — Un lancement intercalé efface la file en silence : le 2026-10-24, lancer l'entretien courant par /drwil-start (pour corriger la PR #218 bloquée en CLOSING) a remplacé la file décidée au lancement (reouvrir-apres-cloture, contournements-completes) ; state.mjs next a ensuite refusé, sans dire que la file avait disparu. Attendu : un lancement intercalé suspend la file (ou demande), et next/state disent clairement qu'il n'y a plus de file et pourquoi.

## Cadrage du 2026-10-26

Les dix parties se cadrent en cinq fiches, décidées par le demandeur le 2026-10-26 :

- `docs/projects/attestations-sur-l-effet-et-couvre.md` : empreinte d'une attestation sur l'effet du contrôle et `Couvre` des 15 contrats attestés, un seul chantier et une seule séance de réattestation (parties « couverture des contrats attestés » et « attestation sur l'effet du contrôle ») ; tableau `Couvre` à valider.
- `docs/projects/reouverture-dite-et-eprouvee.md` : la réouverture dit ce qu'elle a annulé et qui reprogramme la fusion ; son cycle complet se joue sous Windows (parties « fusion annulée après échec » et « réouverture éprouvée »).
- `docs/projects/next-attend-la-fusion.md` : `next` refuse tant que la PR précédente n'est pas fusionnée (partie « arrêt de file »).
- `docs/projects/journal.md` (chantier fait le 2026-10-28) : registre en SCOPING, code livré couvert, acceptation des critères, hooks déclarés au lancement, ligne d'index retirée (parties « cycle de vie des fiches » et « acceptation par critère »), QUA-172 à QUA-175, QUA-137 et QUA-074 modifiés.
- `docs/projects/release-feu-vert-et-squash.md` : feu vert de publication enregistré, recette qui signale un squash (parties « feu vert » et « recette après squash »).

Décidé de ne rien faire : attendre CodeQL avant la clôture (`reopen` suffit, partie « défaut révélé après la clôture » : la deuxième question est close). Un essai réel de la réouverture sur une vraie PR reste une note, à la prochaine CI rouge après une clôture.
Rangement du 2026-10-26 : la fiche `docs/projects/release-feu-vert-et-squash.md` attend `docs/intentions/release-allegee.md` (alléger d'abord, décision du demandeur). Reste non cadrée ici : la note « un lancement intercalé efface la file », voisine de `docs/projects/next-attend-la-fusion.md`.

Fait le 2026-10-28 (chantier « la fusion automatique s'enchaîne dans l'ordre par un outil ») : `node .githooks/merge-auto.mjs <numéro>` programme la fusion dans l'ordre (état calculé, mise à jour si `BEHIND`, programmation, vérification), QUA-161 à QUA-164 ; la consigne de l'état et le skill l'appellent. Restent, non traités : le suivi `pr-watch` et le retour en SCOPING, inchangés ; la fusion manuelle et la décision de fusion (sondage).

## Existant

Relevé dans chaque intention d'origine, à sa date ; non revérifié le 2026-10-25.

### une acceptation humaine par critère, distincte du texte de l'agent (ex-« acceptation-par-critere »)

**Existant (vérifié le 2026-10-17)** :

- Lancement : réponse au sondage lue par un hook, ou `node
  .githooks/state.mjs start` en terminal interactif (QUA-037, une file de
  chantiers décidée d'un geste) ; il vaut acceptation de la fiche entière.
- `drwil attest` : par contrat, identité `git config user.name`
  (déclarative).
- Intentions voisines : `docs/intentions/vue-de-relecture.md` (montrer ce
  qui demande le jugement humain), `docs/intentions/fluidite-sans-perte-de-rigueur.md`
  (afficher qui décide chaque transition), `docs/intentions/forge-dans-le-livrable.md`
  (identité distincte de l'agent).

### un cycle de vie des fiches sans contournement (ex-« cycle-de-vie-des-fiches »)

**Existant (vérifié le 2026-10-17)** :

- Fiches de référence : statut « référence », cadrage gardé sans être un
  chantier à lancer (`.githooks/briefs.mjs`) ; ce dépôt en a une pour la
  mécanique du kit (`docs/projects/kit-mechanics.md`).
- QUA-035 (un cadrage complet du premier coup, un élargissement sans
  friction) : `check-docs` avertit déjà une fiche dont un critère crée un
  contrat sans citer `.drwil/ia-first.json`.
- QUA-016 (rappel de cadrage), réglage `scopeReminder`.

### l'arrêt d'une file et ses comptes rendus vérifiés par un contrôle (ex-« arret-de-file-verifie »)

**Existant (vérifié le 2026-10-16)** :

- `node .githooks/state.mjs next` lance la tête de file depuis SCOPING,
  sans vérifier que la PR du chantier précédent est fusionnée ni que la
  branche principale est à jour.
- La clôture exige déjà une évidence `PASS` de verify (QUA-034, QUA-022) :
  un chantier en FAIL ou MANUAL ne peut pas être clos, donc pas suivi.

### déclarer ce que couvrent les contrats attestés du dépôt (ex-« couverture-des-contrats-attestes »)

**Existant (relevé le 2026-10-21)** :

- 13 contrats sont `ATTESTED` dans ce dépôt, sans `**Couvre**` ; `drwil doctor`
  rend un avertissement « Couverture des attestations » qui les liste.
- Déclarer un `**Couvre**` change l'empreinte d'une attestation de version 3,
  mais pas celle d'une version 2 (jugée sans couverture) : la réattestation
  est un geste humain (`drwil attest <ID> --renew`).

### une attestation ne doit pas tomber quand un contrôle change de forme sans changer d'effet (ex-« attestation-sur-l-effet-du-controle »)

**Existant (relevé le 2026-10-24)** :

- L'empreinte d'une attestation couvre la déclaration complète des contrôles de
  `.drwil/ia-first.json` ; l'humain a dû ré-attester les six contrats.

### corriger un défaut révélé après la clôture (ex-« defaut-revele-apres-la-cloture »)

**Existant (relevé le 2026-10-21)** :

- `.githooks/scope-gate.mjs` refuse tout fichier de code dès que l'activité
  n'est pas BUILD, quelle que soit la fiche qui le couvre.
- `.githooks/state.mjs` : depuis CLOSING, la seule transition est SCOPING ;
  `start` depuis CLOSING exige que la PR du chantier soit **déjà fusionnée**
  (`closingMerged`), ce qui est précisément ce que le défaut empêche, et le
  réglage `transitions: "human"` réserve le lancement à l'humain.
- `.githooks/detour.mjs` ouvre un détour depuis BUILD seulement, et part de la
  branche principale : un défaut qui porte sur du code pas encore fusionné n'y
  est pas visible.
- Contournement employé : inscrire le correctif à l'entretien courant
  (`docs/projects/routine-maintenance.md`), puis demander à l'humain
  `move SCOPING` et `start` — deux commandes pour une ligne de code.

### une réouverture refusée après l'annulation de la fusion automatique (ex-« reouverture-fusion-annulee-apres-echec »)

**Existant (vérifié le 2026-10-24)** :

- `.githooks/state-cli.mjs` (`reopen`) : annulation par `gh pr merge
  --disable-auto`, puis commit de la fiche ; en cas d'échec du commit, la
  fiche est retirée et le texte `reopenCancelled` est ajouté au refus.

### la réouverture éprouvée sur une vraie PR et sous Windows (ex-« reouverture-eprouvee-en-reel »)

**Existant (vérifié le 2026-10-24)** :

- `.githooks/state-cli.mjs` (`reopen`) appelle `gh pr view <branche> --json
  number,state,autoMergeRequest` et `gh pr merge <n> --disable-auto`.
- Le test de cycle QUA-118 (nouvelle clôture d'un chantier rouvert) est sauté
  sous Windows ; la mécanique y reste couverte par les tests des hooks.

### le feu vert de publication enregistré par l'outil au lancement (ex-« feu-vert-publication-enregistre »)

**Existant (vérifié le 2026-10-18)** :

- `docs/recipes/create-a-release.md` (et son gabarit), section
  « Publication green light » : le feu vert couvre une release, nomme sa
  version, jamais une publication npm.
- La fusion automatique, elle, est autorisée au lancement et enregistrée
  par `.githooks/state.mjs` (affichée par le rappel, effacée au retour en
  SCOPING) : un modèle possible.

### la dernière version d'une fiche fusionnée par squash dans la fiche de recette (ex-« fiche-recette-apres-squash »)

**Existant (vérifié le 2026-10-19)** :

- `.githooks/acceptance-sheet.mjs` (`briefText`) : version au commit de la
  candidate, sinon parent du dernier commit (hors fusion) qui supprime la
  fiche.
- Ce dépôt fusionne ses PR par commit de fusion : non touché.
- Les commits de la branche d'un squash ne sont plus dans l'historique de
  la branche principale ; gh peut encore les donner (commits de la PR).

## Questions à trancher

- [décision] Découper ce regroupement en lots, chacun vérifiable seul, et choisir le premier.

### une acceptation humaine par critère, distincte du texte de l'agent (ex-« acceptation-par-critere »)

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

### un cycle de vie des fiches sans contournement (ex-« cycle-de-vie-des-fiches »)

- [décision] Le registre des contrats (`docs/contracts.md`) est-il
  inscriptible en SCOPING sans avertissement, puisque cadrer un critère
  exige son contrat ?
- [décision] À la clôture, le cadrage de la fiche est-il versé
  automatiquement dans une fiche de référence (« code livré »), plutôt
  que de laisser l'utilisateur la créer à la main ?
- [décision] Ou bien un fichier de code déjà commité sur la branche
  principale est-il couvert par défaut, le cadrage ne gardant que le
  code nouveau ou modifié ? (plus simple, mais il faut vérifier qu'il
  n'affaiblit pas la barrière.)

### l'arrêt d'une file et ses comptes rendus vérifiés par un contrôle (ex-« arret-de-file-verifie »)

- [décision] `next` doit-il refuser tant que la PR précédente n'est pas
  fusionnée (vérification par `gh` ou par la base de la branche) ?
- [décision] Le compte rendu de clôture doit-il être un fichier écrit et
  contrôlé (par exemple dans l'évidence), ou rester une consigne ?

### déclarer ce que couvrent les contrats attestés du dépôt (ex-« couverture-des-contrats-attestes »)

- Quels chemins chaque contrat attesté juge-t-il réellement (un contrat par
  contrat : QUA-013, etc.) ?
- Réattester tous les contrats d'un coup, ou à mesure qu'ils changent ?

### une attestation ne doit pas tomber quand un contrôle change de forme sans changer d'effet (ex-« attestation-sur-l-effet-du-controle »)

- [décision] Quelle empreinte : commande normalisée et tests visés de chaque
  contrôle cité par le contrat, sans les champs d'exécution ?
- [décision] Comment éviter qu'un contrôle dont l'effet change vraiment ne
  conserve son attestation (QUA-013, un contrôle non exécuté n'est pas passé) ?

### corriger un défaut révélé après la clôture (ex-« defaut-revele-apres-la-cloture »)

- Un détour depuis CLOSING, resté sur la branche du chantier, est-il la bonne
  réponse, ou faut-il une activité FIX dédiée ?
- La clôture doit-elle attendre le verdict de l'analyse de la forge (CodeQL)
  avant d'écrire la preuve, pour que ces défauts tombent encore en BUILD ?
- Un retour en BUILD après clôture oblige-t-il à réécrire la preuve du chantier
  (le commit vérifié change) ?

### une réouverture refusée après l'annulation de la fusion automatique (ex-« reouverture-fusion-annulee-apres-echec »)

- [décision] Reprogrammer la fusion automatique quand la réouverture échoue
  après l'annulation (au risque d'une fusion du code fautif), ou laisser la
  fusion à l'humain, comme aujourd'hui ?

### la réouverture éprouvée sur une vraie PR et sous Windows (ex-« reouverture-eprouvee-en-reel »)

- [décision] Un essai réel à la prochaine CI rouge après une clôture suffit-il,
  ou faut-il un scénario du banc ?
- [décision] Un `gh` simulé lançable sous Windows (`gh.cmd` et `shell`) pour
  ne plus sauter le cycle complet ?

### le feu vert de publication enregistré par l'outil au lancement (ex-« feu-vert-publication-enregistre »)

- [décision] Enregistrer le feu vert dans l'état au lancement (sondage de
  `/drwil-start`, `state.mjs start`), affiché par le rappel et effacé une
  fois la release créée, ou le garder comme une phrase de la demande ?

### la dernière version d'une fiche fusionnée par squash dans la fiche de recette (ex-« fiche-recette-apres-squash »)

- [décision] Lire la fiche au dernier commit de la PR (gh) quand le
  commit qui la supprime est un squash, ou le signaler dans la fiche de
  recette (« version du cadrage, fusion par squash ») ?
