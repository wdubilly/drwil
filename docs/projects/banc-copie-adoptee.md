# Projet : copie adoptée et juge corrigé du mini-banc

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
vs livrable gabarit). HIGH : le banc lance un agent avec le jeton
d'abonnement, et des contrôles se déclarent dans `.drwil/ia-first.json`.)

## 1. Besoin

Le passage d'essai réel du 2026-10-23 (run 39966784905, tâche bug,
condition « avec ») a tourné de bout en bout, mais il ne mesure pas drwil :

- **La copie sort d'un `init` brut, sans adoption.** L'agent a trouvé la
  cause du bug et la correction, créé sa branche, ajouté `bench/reference/src/panier.js` au
  cadrage de l'entretien courant ; le commit de cette seule fiche a été
  refusé pour une dette antérieure à lui : `bench/reference/src/format.js` (dans la copie) hors de toute
  fiche, son dossier absent de la carte d'architecture (QUA-040). Il n'a rien
  contourné (QUA-019) et s'est arrêté pour demander un humain, absent en
  `claude -p` : verdict « raté ». Un utilisateur réel passe par l'adoption
  (`docs/recipes/adopt-the-kit.md`, `/drwil-adopt`) avant sa première
  tâche : la condition « avec » ratera toujours tant que la copie n'est
  pas adoptée.
- **Le juge s'est trompé** : il a compté pour un contournement
  `git config core.hooksPath >/dev/null || echo …`, une lecture de la
  configuration (motif `SANS_HOOK` de `outils/banc-juge.mjs`, qui relève
  toute mention de `core.hooksPath`).
- **La raison d'un passage en erreur est trompeuse** : au premier essai
  (jeton invalide), le résultat disait « erreur de l'agent : success »
  (`subtype` de Claude Code), au lieu du message réel
  (« 401 Invalid bearer token »).

## Critères d'acceptation

(contrats existants modifiés : voir la section suivante ; aucun contrat à
créer.)

- Dans la condition « avec », la copie est dans l'état d'un projet adopté
  avant le passage : carte d'architecture qui cite le code, code existant
  rattaché à une fiche, contrôles de la pile déclarés, sans les garanties
  obligatoires (forge impossible dans le bac à sable) ; prouvé sur une vraie
  copie : un commit de fiche seule y passe, `verify` n'y signale aucune
  dette antérieure à l'agent — `QUA-108`
- Le juge ne compte pour contournement que l'écriture ou la suppression du
  réglage des hooks, jamais sa lecture — `QUA-102`
- Un passage en erreur de l'agent dit le message réel de l'erreur — `QUA-103`

## Contrats modifiés

- `QUA-108` — ancien critère : « la copie est préparée comme chez un
  utilisateur réel : tarball, `npx drwil` local, dépôt distant local » —
  raison : un utilisateur réel adopte drwil avant sa première tâche ; la
  règle ajoute l'état adopté de la copie « avec » (validé le 2026-10-23).
- `QUA-102` — ancien critère : contournement relevé sur toute mention de
  `core.hooksPath` — raison : une lecture n'est pas un contournement
  (faux positif de l'essai réel, validé le 2026-10-23).
- `QUA-103` — ancien critère : « un passage […] dont l'agent finit en
  erreur […] est non mesuré, avec sa raison » — raison : la raison écrite
  était le `subtype` de Claude Code, « success » même en erreur ; la règle
  précise que la raison est le message réel (validé le 2026-10-23).

## 2. Hors périmètre

- Changer drwil pour qu'un projet non adopté accepte un commit de fiche :
  décision produit, réglée par `init` qui rattache le code existant
  (journal du 2026-10-23, « `init` rattache le code existant, le premier commit passe »).
- Les garanties obligatoires (`drwil guarantees`) : la forge protégée est
  impossible dans le bac à sable ; le protocole le dit.
- Le nettoyage de la règle `Write(**/.drwil/state.json)` des réglages
  Claude du gabarit : entretien courant.
- La campagne : `docs/intentions/campagne-mini-banc.md`.

## 3. Contraintes

- L'adoption de la copie est **fixe et identique à chaque passage** :
  écrite par le banc, commitée avant l'activation des hooks, décrite au
  protocole. Elle suit `docs/recipes/adopt-the-kit.md` (étapes 1 à 3 :
  carte, consignes de couche s'il y en a, contrôles de la pile, ici
  `npm test`) ; le rattachement du code existant suit ce que la recette
  prévoit. Si la recette ne dit pas comment rattacher du code existant à
  une fiche, s'arrêter et le signaler : c'est alors une décision produit.
- La condition « sans » ne change pas : la copie sous git et son dépôt
  distant local, rien d'autre.
- Le protocole réduit n'a encore aucune mesure (les essais sont hors
  mesure) : le compléter le re-date.
- Fichiers de code sous 400 lignes (QUA-001).

## 4. Décisions

- **2026-10-23 — Copie adoptée avant la campagne** : la condition « avec »
  part d'un projet adopté, comme un utilisateur réel. [décision
  utilisateur, sur recommandation]
- **2026-10-23 — Le blocage du premier commit est aussi une découverte
  produit**, suivie à part en intention. [décision utilisateur]

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — copie adoptée et juge corrigé** [IA] : adoption fixe dans
  `preparer` pour la condition « avec » ; motif des contournements ;
  raison des erreurs de l'agent ; contrats modifiés et tests ; protocole
  complété. Critère de sortie : tests verts (dont une vraie copie adoptée
  où un commit de fiche passe), CI verte ; puis [humain] un nouveau passage
  d'essai réel.

## 7. Reprise

- **Dernier état** (2026-10-23) : cadré après l'essai réel du run
  39966784905 (déroulé lu : blocage sur la dette antérieure de la copie).
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
