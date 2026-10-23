# Projet : déroulé de session et copie réaliste du mini-banc

**Statut** : cadré le 2026-10-23.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/campagne-mini-banc.md`

<!-- scope
files:
  - outils/banc.mjs
  - outils/banc-juge.mjs
  - outils/banc.test.mjs
  - docs/benchmark-protocole.md
  - docs/contracts.md
  - .drwil/ia-first.json
-->

(cadrage : ce dépôt seulement — QUA-018 (périmètre explicite : dépôt drwil
vs livrable gabarit) : le banc mesure le livrable, il n'en fait pas
partie. HIGH : le déroulé vient d'un agent qui tourne avec le jeton
d'abonnement, il doit sortir du job sans ce jeton, et un contrat se
déclare dans `.drwil/ia-first.json`.)

## 1. Besoin

Le passage d'essai du mini-banc (`docs/intentions/campagne-mini-banc.md`)
doit montrer comment un vrai agent vit drwil : s'il lance un chantier
(`transitions: agent`), où il est bloqué (branche principale, attestation,
clôture sans forge) et pourquoi. Aujourd'hui, le résultat JSON d'un passage
ne garde que les chiffres et le verdict du juge : on saura qu'il y a eu des
blocages, pas lesquels. Conserver, pour chaque passage, le déroulé de la
session de l'agent (le flux `stream-json` de `claude -p`), secrets masqués,
à côté de son résultat, dans l'artefact du run. Il sert aussi à la
relecture humaine de l'« annonce sans preuve », que le juge ne mesure pas.

Le passage doit aussi être un test réel : la copie « avec drwil » doit
être installée comme chez un utilisateur. Relevé le 2026-10-23 dans le
code : drwil n'est pas publié sur npm (`npm view drwil` : 404), il
s'installe depuis le tarball d'une release ; or la copie du banc reçoit
drwil par `drwil init` lancé depuis le dépôt, sans paquet installé, et les
consignes installées font lancer `npx drwil verify` à l'agent, qui
échouerait ou irait chercher un paquet homonyme sur le registre npm. Et la
copie n'a aucun dépôt distant : pousser sa branche, geste normal sous
drwil, échouerait aussi. Le blocage n'est pas dans drwil mais dans le
banc : il fausserait la mesure contre la condition « avec ».

## Critères d'acceptation

(contrats à créer par ce chantier, avec leur champ Origine.)

- Chaque passage, mesuré ou non, écrit le déroulé de la session de l'agent
  à côté de son résultat, tel que reçu, ligne à ligne ; tout jeton ou clé y
  est masqué avant l'écriture, et le résultat dit le nombre de masques ;
  le rapport ne lit que les résultats, jamais un déroulé — `QUA-107`
- La copie est préparée comme chez un utilisateur réel : dans la
  condition « avec », drwil est installé depuis le tarball du dépôt en
  dépendance de développement, puis `init` par ce paquet, et `npx drwil`
  s'y résout sur place, jamais sur le registre npm ; dans les deux
  conditions, la copie a un dépôt distant local où pousser une branche.
  Prouvé sur une copie préparée réellement : `npx drwil verify` y tourne
  hors réseau, aucune fiche bloquante n'y existe, une branche s'y pousse —
  `QUA-108`

## 2. Hors périmètre

- Le diff final de la copie de l'agent : le juge relève déjà les fichiers
  touchés et les contournements.
- L'analyse automatique du déroulé (phases de drwil franchies, blocages
  nommés) : à décider après la lecture de l'essai.
- `.github/workflows/banc.yml` : le déroulé s'écrit dans le dossier de
  sortie déjà envoyé en artefact, rétention par défaut de GitHub.
- La campagne elle-même : `docs/intentions/campagne-mini-banc.md`.
- Une forge simulée (PR, fusion) : aucune dans le bac à sable ; un agent
  sous drwil s'arrête au plus à la clôture, limite écrite au protocole.
  L'agent est jugé sur son livrable, pas sur sa clôture.
- Les garanties obligatoires (`drwil guarantees`, forge protégée) : ni
  câblées ni exigées après un simple `init`, comme chez un projet qui
  vient d'adopter drwil ; le protocole le dit.

## 3. Contraintes

- Le rapport lit tous les fichiers JSON du dossier des résultats : le
  déroulé porte une autre extension (JSON Lines), sinon le rapport le
  prendrait pour un résultat.
- Le dépôt est public : l'artefact d'un run se télécharge par tout compte
  GitHub connecté. Le masquage passe par `masquerSecrets`, comme le
  résultat (QUA-105 : aucun secret dans les résultats).
- Un passage « non mesuré » garde son déroulé, même partiel (délai
  dépassé, erreur de l'agent) : c'est là qu'il sert le plus. Un passage
  qui n'a pas lancé l'agent n'en a pas, et le résultat le dit.
- Le protocole réduit n'a encore aucune mesure : le compléter (table des
  mesures) le re-date, sans conséquence sur une mesure.
- Mêmes conditions de départ avec et sans drwil : le dépôt distant local
  existe dans les deux ; seule l'installation de drwil diffère.
- Le tarball est celui de la version construite par le workflow
  (`npm run build`, puis `npm pack`), jamais une version publiée ailleurs.
- Fichiers de code sous 400 lignes (QUA-001) : `outils/banc.mjs` et
  `outils/banc-juge.mjs` en ont 260 chacun.

## 4. Décisions

- **2026-10-23 — Conserver le déroulé avant l'essai** : plutôt que lancer
  l'essai sans voir le parcours de l'agent sous drwil. [décision
  utilisateur]
- **2026-10-23 — Un fichier par passage, à côté du résultat**
  (même nom que le résultat, extension JSON Lines), dans l'artefact existant.
  [proposé par l'agent, validé avec la fiche]
- **2026-10-23 — Un test réel** : la copie « avec drwil » installée comme
  chez un utilisateur (tarball, `npx drwil` local), un dépôt distant local
  dans les deux conditions. [décision utilisateur]

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — déroulé conservé** [IA] : `passage` rend les lignes du flux,
  l'écriture du résultat écrit aussi le déroulé masqué ; le contrat créé
  et son contrôle par règle (QUA-033) ; table des mesures du protocole complétée.
  Critère de sortie : tests verts, dont un passage simulé avec un faux
  jeton dans le flux, masqué dans le déroulé écrit, et un rapport qui
  ignore le déroulé.
- **Lot 2 — copie réaliste** [IA] : `preparer` installe drwil depuis le
  tarball dans la condition « avec » et crée le dépôt distant local dans
  les deux ; contrat et contrôle ; conditions du protocole complétées.
  Critère de sortie : un test prépare une vraie copie « avec » et y fait
  tourner `npx drwil verify` hors réseau, sans fiche bloquante, et y
  pousse une branche.

## 7. Reprise

- **Dernier état** (2026-10-23) : cadré ; le secret
  `CLAUDE_CODE_OAUTH_TOKEN` est enregistré, le workflow `banc` est actif
  sur la branche principale, l'essai attend ce chantier.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`) ;
  après sa fusion, le passage d'essai réel.
