# Projet : Gouvernance — Machine d’état et double barrière

**Risque** : HIGH

**Statut** : cadré le 2026-10-07 — en attente de démarrage

<!-- cadrage
fichiers:
  - packages/drwil/templates/common/base/.githooks/etat.mjs
  - packages/drwil/templates/common/base/.githooks/etat.test.mjs
  - .githooks/etat.mjs
  - .githooks/etat.test.mjs
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - .claude/settings.json
  - packages/drwil/templates/common/base/gitignore
  - .gitignore
  - packages/drwil/templates/fr/base/AGENTS.md
  - packages/drwil/templates/en/base/AGENTS.md
  - AGENTS.md
  - packages/drwil/templates/fr/base/docs/ia-first.md
  - packages/drwil/templates/en/base/docs/ia-first.md
  - docs/ia-first.md
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/templates/fr/base/docs/projets/mecanique-ia-first.md
  - packages/drwil/templates/en/base/docs/projects/kit-mechanics.md
  - packages/drwil/bin/drwil.js
  - packages/drwil/src/index.ts
  - packages/drwil/templates/common/base/.githooks/perimetre.mjs
  - packages/drwil/templates/common/base/.githooks/perimetre.test.mjs
  - packages/drwil/templates/common/base/.githooks/prepare-commit-msg
  - packages/drwil/templates/common/base/.githooks/moteur.mjs
  - packages/drwil/templates/common/base/.githooks/contrats.mjs
  - packages/drwil/templates/common/base/.githooks/check-control-coverage.mjs
  - .githooks/perimetre.mjs
  - .githooks/perimetre.test.mjs
  - .githooks/prepare-commit-msg
  - .githooks/moteur.mjs
  - .githooks/contrats.mjs
  - .githooks/check-control-coverage.mjs
  - .drwil/ia-first.json
-->

(cadrage du Lot 1 : lecteur d'état dans `.githooks/` — utilisable par le
pre-commit sans dépendre de `npx` —, hook `SessionStart` de Claude, consignes
et doc des deux côtés (QUA-018). Les copies de `.githooks/` restent
identiques à celles du gabarit. Chaque lot suivant ajoute ses fichiers.)

---

## 1. Besoin

Mettre en place dans DRWIL une **machine d’état de gouvernance** qui contraint l’agent à réaliser une demande dans le cadre d’une activité et d’une attente explicites, sans dépendre de sa mémoire, de sa bonne volonté ou de sa capacité à conserver le contexte au fil des échanges.

Le principe fondamental est :

> **La mémoire de l’agent n’est pas une source de vérité.**

L’état courant de DRWIL doit être matérialisé sur disque dans `.drwil/state.json` (à créer) et constituer la référence opérationnelle locale à l’instant présent.

DRWIL doit distinguer les différentes activités du cycle de travail :

```text
INTENTION
    ↓
CADRAGE
    ↓
ATTENTE
    ↓
DEMANDE
    ↓
RÉALISATION
    ↓
PREUVES
    ↓
VERIFY
    ↓
CLOTURE
    ↓
CADRAGE
```

Une **attente** définit ce qui doit être obtenu.

Une **activité** définit ce que l’agent est actuellement autorisé à faire.

L’état runtime doit donc permettre de déterminer à tout moment :

* l’activité courante ;
* l’attente active éventuelle ;
* la demande active éventuelle ;
* le périmètre applicable ;
* les conditions de gouvernance applicables à cette activité.

La gouvernance doit comporter deux barrières complémentaires :

1. une **barrière comportementale**, qui informe et contraint l’agent ;
2. une **barrière mécanique déterministe**, qui empêche la livraison d’une modification non conforme.

La seconde barrière ne doit pas dépendre du comportement de l’agent.

---

## 2. Modèle de cycle

Le cycle DRWIL est organisé autour d’activités de gouvernance :

```text
INTENTION
   ↓
CADRAGE
   ↓
ATTENTE
   ↓
DEMANDE
   ↓
RÉALISATION
   ↓
PREUVES
   ↓
VERIFY
   ↓
CLOTURE
   ↓
CADRAGE
```

L’attente n’est donc pas l’état global du système.

Elle constitue **le cadre contractuel d’une réalisation**.

L’activité courante indique **où se trouve DRWIL dans le cycle et quelles actions sont autorisées à cet instant**.

Exemple :

```text
CADRAGE
attente_active = null

        ↓ création / activation

ATTENTE ou DEMANDE
attente_active = ATT-XXX

        ↓ réalisation

RÉALISATION
attente_active = ATT-XXX

        ↓ contrôles

VERIFY
attente_active = ATT-XXX

        ↓ clôture

CLOTURE
attente_active = ATT-XXX

        ↓ fin

CADRAGE
attente_active = null
```

---

## 3. Principe de vérité terrain

Le fichier :

```text
.drwil/state.json
```

représente **l’état runtime courant de DRWIL**.

Il ne constitue pas le contrat historique du projet et ne doit pas devenir une seconde source de vérité versionnée.

Il doit notamment permettre de déterminer :

* l’activité courante ;
* si une attente est active ;
* quelle attente est active ;
* si une demande est active ;
* quel périmètre est applicable ;
* quelles règles doivent être appliquées par les garde-fous.

Le principe est :

```text
DISK > RAM

CONTRAT > MÉMOIRE DE L’AGENT

PREUVE > AFFIRMATION DE L’AGENT

VÉRIFICATION > CONFIANCE
```

Les garde-fous DRWIL ne doivent jamais considérer l’affirmation du LLM comme une preuve suffisante.

Ils vérifient l’état persistant et l’état réel du dépôt.

### État runtime versus état versionné

`state.json` (à créer) est un **état d’exécution local**.

Il doit donc être ignoré par Git :

```gitignore
# DRWIL runtime state
.drwil/state.json
```

Le dépôt doit versionner les éléments durables de gouvernance, notamment :

* les attentes ;
* les contrats ;
* les règles ;
* la documentation ;
* les preuves qui ont vocation à constituer un historique durable ;
* les attestations lorsque le modèle DRWIL les prévoit comme éléments versionnés.

À l’inverse, l’état courant :

```text
activité actuelle
attente active
demande active
périmètre runtime
état de session
```

reste local au projet.

> **Le contrat est durable. L’état d’exécution est éphémère.**

---

## 4. État de gouvernance

Le modèle minimal attendu doit représenter l’activité courante et les références nécessaires à son exécution.

Exemple conceptuel :

```json
{
  "activite": "REALISATION",
  "attente_active": "ATT-001",
  "demande_active": "DEM-001",
  "perimetre_actif": [
    "src/auth/",
    "tests/auth/"
  ]
}
```

En phase de cadrage :

```json
{
  "activite": "CADRAGE",
  "attente_active": null,
  "demande_active": null,
  "perimetre_actif": []
}
```

L’état complet des attentes ne doit pas nécessairement être dupliqué dans `state.json` (à créer).

Le schéma définitif devra déterminer comment l’état runtime référence les attentes et contrats existants sans créer de seconde source de vérité.

En particulier :

> **`state.json` (à créer) indique ce qui est actif maintenant ; les attentes et contrats définissent ce qui doit être vrai.**

---

## 5. Activités de gouvernance

DRWIL doit distinguer au minimum les activités suivantes.

### `CADRAGE`

Aucune réalisation applicative active.

L’agent peut :

* lire le projet ;
* analyser un besoin ;
* clarifier une intention ;
* préparer une attente ;
* consulter les contrats ;
* préparer une demande.

### `ATTENTE`

L’attente est en cours de formalisation ou de validation.

L’agent peut travailler sur les éléments nécessaires à la définition de ce qui doit être obtenu.

### `DEMANDE`

Une attente existe et la demande de réalisation est explicitée.

Cette activité prépare le passage à la réalisation effective.

### `REALISATION`

L’agent peut modifier le projet dans le cadre de l’attente active et de son périmètre autorisé.

### `PREUVES`

Les contrôles et preuves nécessaires à la démonstration de conformité sont produits ou collectés.

### `VERIFY`

DRWIL exécute son moteur de vérification existant et produit un verdict.

### `CLOTURE`

La réalisation est terminée.

La conformité finale, les éventuelles attestations et la remise à l’état neutre sont effectuées avant de revenir à :

```text
activite = CADRAGE
attente_active = null
demande_active = null
```

Les transitions exactes entre activités devront être définies et contrôlées.

---

## 6. Première barrière — comportementale

L’agent doit recevoir, via `AGENTS.md` et les éventuels fichiers d’instructions spécifiques aux outils, le contexte de gouvernance nécessaire à son activité courante.

Le contexte doit être déterminé à partir de `.drwil/state.json` (à créer).

L’agent ne doit pas déduire lui-même son activité à partir de sa mémoire conversationnelle.

Exemple :

```text
activite = CADRAGE
```

implique qu’aucune réalisation applicative ne doit commencer.

Exemple :

```text
activite = REALISATION
attente_active = ATT-001
```

implique que la réalisation doit respecter l’attente `ATT-001` et son périmètre.

Cette barrière est **comportementale**.

Elle ne constitue donc pas à elle seule une garantie de sécurité ou de conformité.

---

## 7. Rafraîchissement du contexte

DRWIL doit pouvoir extraire l’état de gouvernance présent sur disque afin de le rendre disponible à l’agent.

Le contexte doit notamment permettre de rappeler :

* l’activité courante ;
* l’attente active ;
* la demande active ;
* le titre de l’attente ;
* son périmètre ;
* ses critères de recette ;
* les règles applicables à l’activité courante.

Le mécanisme doit être déterministe et ne doit pas utiliser une IA pour reconstruire l’état.

L’objectif est de réduire le **context drift / attention drift** en réinjectant depuis le disque le cadre opérationnel réellement actif.

---

## 8. Deuxième barrière — mécanique déterministe

Un contrôle mécanique doit être exécuté au moment de la livraison, notamment via le hook Git `pre-commit`.

Ce contrôle doit vérifier l’état réel du dépôt et l’état de gouvernance runtime.

Il doit notamment pouvoir vérifier :

1. que l’activité autorise une livraison ;
2. qu’une attente valide est active lorsqu’une modification applicative est livrée ;
3. que les fichiers modifiés respectent le périmètre autorisé ;
4. que les contrôles obligatoires applicables sont satisfaits ;
5. que les conditions de livraison ne sont pas en échec.

Une modification hors périmètre doit provoquer un refus mécanique du commit.

Une tentative de commit dans une activité qui n’autorise pas la modification concernée doit également être refusée.

Le refus doit être :

* déterministe ;
* local ;
* indépendant du LLM ;
* sans appel à une IA ;
* sans consommation de tokens ;
* explicite ;
* réversible.

---

## 9. Périmètre de l’attente

Le périmètre d’une attente doit permettre de déterminer quelles modifications sont autorisées pendant sa réalisation.

Exemple :

```text
src/auth/
tests/auth/
```

Une modification située en dehors de ce périmètre doit être détectée par la barrière mécanique.

Les fichiers nécessaires au fonctionnement de DRWIL et de sa gouvernance doivent faire l’objet d’une règle explicite.

Il ne doit pas exister d’exception globale permettant de contourner silencieusement le périmètre, notamment au moyen d’un simple préfixe tel que `docs/`.

Le système doit privilégier une politique explicite et traçable.

---

## 10. Réutilisation de l’architecture DRWIL existante

Ce chantier ne doit pas créer un second moteur de gouvernance parallèle.

Il doit réutiliser autant que possible :

* le modèle de contrats existant ;
* le moteur de vérification existant ;
* les contrôles existants ;
* les hooks Git existants ;
* les mécanismes de preuve ;
* les règles de sévérité existantes.

La nouvelle machine d’état doit servir à déterminer **le cadre actif de travail** et à renforcer les barrières existantes.

Elle ne doit pas remplacer :

```text
CONTRACT
CONTROL
VERIFY
EVIDENCE
VERDICT
```

mais les articuler dans un cycle de réalisation gouverné.

---

## 11. Séparation des responsabilités

L’architecture doit conserver une séparation claire :

```text
Markdown
   ↓
Définit / documente les règles durables
   ↓
state.json
   ↓
Indique l’état runtime courant
   ↓
Scripts DRWIL
   ↓
Interprètent et contrôlent
   ↓
Git hooks
   ↓
Appliquent mécaniquement
```

Aucune information critique ne doit dépendre uniquement du contexte conversationnel du LLM.

---

# Lots

## Lot 1 — Machine d’état et contexte [IA]

Mettre en place la base permettant de matérialiser et lire l’activité courante de DRWIL.

À réaliser :

* définir le schéma minimal de `.drwil/state.json` (à créer) ;
* définir les activités supportées ;
* définir les transitions autorisées ;
* implémenter ou adapter un lecteur d’état unique ;
* valider la structure et les références de l’état ;
* permettre de récupérer l’activité courante ;
* permettre de récupérer l’attente active ;
* produire un contexte lisible pour l’agent ;
* intégrer les instructions nécessaires dans `AGENTS.md` ;
* prendre en compte les éventuels fichiers d’instructions spécifiques aux agents ;
* documenter le fonctionnement de la machine d’état.

`state.json` (à créer) doit être ajouté au `.gitignore` et ne doit pas être versionné.

Le lot ne doit pas créer une seconde logique de vérification indépendante du moteur DRWIL existant.

---

## Lot 2 — Transitions et activation [IA]

Permettre de faire évoluer l’état de gouvernance de manière contrôlée.

Le mécanisme doit permettre conceptuellement :

```text
CADRAGE
    ↓
ATTENTE
    ↓
DEMANDE
    ↓
REALISATION
    ↓
PREUVES
    ↓
VERIFY
    ↓
CLOTURE
    ↓
CADRAGE
```

Les mutations de `state.json` (à créer) doivent être contrôlées et validées.

L’agent ne doit pas pouvoir modifier arbitrairement l’état pour supprimer ou contourner une contrainte.

Les modalités exactes de transition devront être définies sans introduire de procédure inutilement lourde.

---

## Lot 3 — Barrière mécanique Git [IA]

Renforcer le `pre-commit` existant afin de vérifier l’état de gouvernance avant livraison.

Le contrôle doit notamment :

* lire l’activité courante ;
* détecter l’absence d’attente lorsque celle-ci est requise ;
* identifier l’attente active ;
* déterminer le périmètre autorisé ;
* comparer ce périmètre avec les fichiers réellement modifiés/stagés ;
* refuser une modification hors périmètre ;
* refuser une livraison dans une activité qui ne l’autorise pas ;
* produire un message explicite en cas de refus.

Le contrôle doit utiliser l’état réel du dépôt et l’état runtime, et non une affirmation fournie par l’agent.

---

## Lot 4 — Intégration avec VERIFY [IA]

Relier la machine d’état au système de contrats et de vérification existant.

Le lot doit déterminer :

* comment une attente référence les contrats applicables ;
* comment les critères de recette sont reliés aux contrôles DRWIL ;
* comment les preuves sont produites ;
* comment `VERIFY` participe à la transition vers la clôture ;
* comment les états `PASS / FAIL / ERROR / MANUAL / ATTESTED` s’intègrent au cycle de l’attente.

Le résultat attendu est de ne pas créer un système parallèle de recette.

---

## Lot 5 — Cycle complet [Humain + IA]

Tester un cycle réel :

```text
INTENTION
→ CADRAGE
→ ATTENTE
→ DEMANDE
→ REALISATION
→ PREUVES
→ VERIFY
→ CLOTURE
→ CADRAGE
```

Le test doit démontrer au minimum :

* qu’une réalisation ne peut pas être livrée dans une activité qui ne l’autorise pas ;
* qu’une modification hors périmètre est refusée ;
* que les contrôles existants continuent de fonctionner ;
* que l’attente peut être clôturée proprement ;
* que l’état runtime revient ensuite à une situation neutre ;
* que `state.json` (à créer) reste local et n’est pas versionné par Git.

---

## Lot 6 — Documentation et réversibilité [Humain + IA]

Documenter :

* les activités de gouvernance ;
* les transitions ;
* le concept d’attente active ;
* le cycle de vie ;
* les règles de périmètre ;
* les barrières comportementales ;
* les barrières mécaniques ;
* le fonctionnement du contexte réinjecté ;
* les modalités d’activation et de clôture ;
* la distinction entre état runtime et état versionné ;
* les limites du système.

La documentation doit également préciser comment désactiver ou retirer proprement la gouvernance.

Aucune installation ne doit créer de verrou permanent ou de modification destructive silencieuse.

---

## Décisions

- **2026-10-09 — `state.json` (à créer) reste local** : ignoré par Git, jamais
  versionné. La reprise par une autre personne ou un autre clone passe par les
  éléments versionnés (attente, fiche et sa section « Reprise », QUA-015), puis
  par une réactivation explicite de l'attente — jamais par la reprise de l'état
  d'un autre clone.
- **2026-10-09 — Attente = fiche existante (point 1)** : l'attente active est une
  fiche de `docs/projets/` (ou l'un de ses lots) ; pas de nouveau format
  `ATT-XXX`. Ses contrats sont ceux de sa section « Contrats concernés ».
- **2026-10-09 — Transitions linéaires avec retours (point 2)** : on avance d'une
  activité à la fois, sans saut en avant ; retour à `REALISATION` depuis
  `PREUVES` ou `VERIFY` en échec ; abandon vers `CADRAGE` possible depuis toute
  activité, tracé.
- **2026-10-09 — Périmètre dans la fiche versionnée (point 9)** : le périmètre
  autorisé est le bloc `cadrage` de la fiche active. `state.json` (à créer) ne
  contient que des références : activité, attente active (chemin de la fiche),
  demande active, horodatage. L'exemple `perimetre_actif` des sections 4 et 6
  est donc caduc.
- **2026-10-09 — Démarrage sans état = `CADRAGE` neutre (point 11)** : sans
  `state.json` (à créer), l'activité est `CADRAGE` et aucune attente n'est
  active ; une modification de code est alors hors attente. Aucun état actif
  n'est jamais créé implicitement.
- **2026-10-09 — Dépôt et gabarit (QUA-018)** : le chantier vise les deux.
  Les hooks partagés sont écrits dans `packages/drwil/templates/common/base/.githooks/`
  et recopiés à l'identique dans `.githooks/` (dogfood) ; les transitions
  sont dans `.githooks/etat.mjs` (`node .githooks/etat.mjs passer …`,
  utilisable sans `npx` par tout agent ou humain) et `drwil etat` n'en est
  qu'une façade — révisé le 2026-10-09 ; `AGENTS.md`, `docs/` et
  `.gitignore` sont mis à jour des deux côtés.
- **2026-10-09 — Sévérité réglable, sur le modèle de QUA-016** : la barrière est
  dans `base` avec un réglage `off` / `avertissement` / `bloquant` dans
  `.drwil/ia-first.json`. `bloquant` pour ce dépôt, `avertissement` par défaut
  dans le gabarit ; le retrait propre (Lot 6) passe par `off`. Raison : une
  barrière bloquante dès l'installation refuserait tout commit de code hors
  attente active, y compris l'entretien courant et les commits humains.
  Limite connue : `--no-verify` reste possible en local et la CI ne peut pas
  rejouer le contrôle d'activité (`state.json` (à créer) non versionné) — seul
  le contrôle de périmètre est rejouable en CI.
- **2026-10-09 — Agnostique de l'agent** : l'état et sa commande de lecture
  (`node .githooks/etat.mjs`) ne dépendent d'aucun outil. Le canal universel
  est `AGENTS.md` (première action de toute tâche : lancer la commande) ; un
  hook de démarrage propre à un outil (Claude Code : SessionStart) n'est
  qu'un accélérateur. La garantie reste dans Git (barrière du Lot 3).
- **2026-10-09 — Dogfood non bloqué** : ce clone travaille le chantier avec
  un `state.json` (si présent) local en `REALISATION` sur cette fiche, écrit à
  la main à la demande du demandeur en attendant la commande du Lot 2.
- **2026-10-09 — Transitions réglables (points 3 et 4)** : réglage
  `transitions` de `.drwil/ia-first.json`. `humain` (défaut) : ouvrir une
  attente (`CADRAGE→ATTENTE`, avec `--fiche`), lancer la réalisation
  (`DEMANDE→REALISATION`, seule transition qui autorise à modifier du code)
  et clore (`VERIFY→CLOTURE`) exigent un terminal interactif et la saisie de
  l'activité visée, comme `drwil attest` ; les autres transitions restent
  libres. `agent` : toute transition permise par la machine d'état est libre.
- **2026-10-09 — Garantie visée : triche détectable, refusée hors du poste**.
  Un agent qui a le shell peut toujours tricher en local (réécrire
  `state.json` (si présent), élargir un cadrage, `--no-verify`, modifier
  `.githooks/`). Le chantier ne promet donc pas « triche impossible » mais :
  rejeu du contrôle de périmètre en CI, sur les seules informations
  versionnées (Lot 3) ; toute triche visible dans le diff de la MR ;
  blocages réels quand l'outil les offre ; dernier mot à la relecture
  humaine et à la protection de branche (QUA-017, QUA-019).
- **2026-10-09 — Blocages côté outil (Lot 2)** : règles `deny` de
  `.claude/settings.json` (dépôt et gabarit) sur `git … --no-verify`,
  `git commit -n` et l'écriture de `.drwil/state.json` (si présent) par
  Edit/Write — appliquées par Claude Code, pas par le modèle. Une option
  courte combinée (`-anm`) peut échapper aux motifs : la CI rattrape.
- **2026-10-09 — Élargissement du cadrage (point 12) : bloquant, cadrage lu
  dans la version déjà commitée**. Le pre-commit vérifie les fichiers de code
  contre le bloc `cadrage` de la fiche active tel qu'il est dans `HEAD` ; le
  rejeu en CI, commit par commit, contre celui du commit parent. Élargir son
  périmètre demande donc un commit séparé qui ne touche que la fiche (de la
  doc, toujours autorisée), visible à part dans l'historique ; le code vient
  au commit suivant. Aucun agent ne peut élargir et utiliser son périmètre
  dans un même commit.
- **2026-10-09 — Hors périmètre : les fiches seulement (point 6)**. Toujours
  commitables : `docs/projets/`, `docs/intentions/` et leur équivalent anglais
  (projects)
  (cadrer, tenir sa fiche et la file d'attente). Tout le reste — code et
  autre doc — doit figurer dans le cadrage de la fiche active. Liste
  réglable (`horsPerimetre` de `.drwil/ia-first.json`), jamais un préfixe
  implicite.
- **2026-10-09 — Commit du périmètre en `REALISATION` seulement (point 7)**.
  Hors fiches, un commit n'est accepté qu'en `REALISATION`, et seulement pour
  des fichiers couverts par le cadrage de la fiche active lu dans `HEAD`.
  Un correctif pendant `PREUVES` ou `VERIFY` impose de revenir en
  `REALISATION`.
- **2026-10-09 — CI : trailer `Drwil-Attente`**. Le hook `prepare-commit-msg`
  (que Git ne saute jamais, même avec l'option qui saute `pre-commit`) ajoute
  au message `Drwil-Attente: <fiche active>`. La CI, le pre-push et `drwil
  verify` rejouent chaque commit de la branche contre le cadrage de cette
  fiche dans le commit parent. Un commit est jugé selon les règles de son
  parent : si la barrière n'y existait pas encore, il n'est pas contrôlé.
  L'activité n'existe qu'en local : la CI ne contrôle que le périmètre.
- **2026-10-09 — Sévérité de la barrière** : réglage `barriere`
  (`off` / `avertissement` / `bloquant`) ; `drwil init` écrit
  `avertissement`, ce dépôt est en `bloquant`.
- **2026-10-09 — Attestations hors périmètre (révise le point 6)**. Les
  attestations humaines (`.drwil/evidence/attestations/*`) passent toujours,
  comme les fiches : `drwil attest` les garde déjà (terminal requis,
  empreinte du contrat) et elles sont relues en revue. Constaté au premier
  commit d'attestations après le Lot 4 : la barrière les refusait, ce qui
  aurait obligé à élargir le cadrage de chaque fiche pour pouvoir clore.
- **2026-10-09 — Clôture sur évidence de verify (point 5)**. `VERIFY → CLOTURE`
  reste une décision humaine et exige en plus la dernière évidence
  `.drwil/evidence/verify-*.json` (écrite par `drwil verify --evidence`) :
  verdict `pass` ou `attested`, commit égal à `HEAD`, arbre non modifié.
  `.githooks/etat.mjs` ne fait que lire cette preuve : aucun second moteur, aucune
  dépendance au paquet drwil. Le verify jugé est le verify complet (tous les
  contrats bloquants) ; la section « Contrats concernés » de la fiche reste
  informative. Limite : l'évidence est hors git, donc falsifiable en local
  (même garantie que le reste : triche détectable, pas impossible).
  `CLOTURE → CADRAGE` reste libre et remet l'état au neutre.
- **2026-10-09 — Réaction aux verdicts (point 8)**. `PASS` et `ATTESTED`
  permettent de clore. `FAIL` et `ERROR` renvoient en `REALISATION` (toute
  correction, y compris de l'outillage, est une modification). `MANUAL` reste
  en `VERIFY` : un humain atteste (`drwil attest`), puis on relance
  `drwil verify --evidence`, qui donne `ATTESTED`. Les critères de recette
  d'une fiche ne forment pas un système parallèle : un critère mécanique
  devient un contrat avec `Contrôle`, un critère humain un contrat `MANUAL`
  à attester.

## Contrats concernés

- **QUA-013** — Contrôle non exécuté n'est pas passé : `VERIFY` reste la source
  du verdict (Lot 4).
- **QUA-015** — Chantiers exploitables à froid : la mémoire de l'agent n'est pas
  une source de vérité ; la reprise se fait depuis le disque.
- **QUA-016** — Rappel de cadrage : le périmètre de l'attente prolonge le
  cadrage par fiche (Lot 3).
- **QUA-018** — Périmètre explicite dépôt / gabarit : le chantier vise les deux.
- **QUA-019** — Pas de contournement d'un contrôle : aucune procédure de
  contournement silencieux de la barrière mécanique.

## Points à trancher

Les décisions suivantes doivent être explicitées avant leur implémentation lorsqu’elles ne sont pas déjà couvertes par les règles DRWIL existantes :

1. **Relation Attente / Contrat** — tranché le 2026-10-09 (voir « Décisions »)
   Une attente référence-t-elle directement un ou plusieurs contrats existants ?

2. **Machine d’état** — tranché le 2026-10-09 (voir « Décisions »)
   Quelles transitions entre activités sont autorisées ?

3. **Activation** — tranché le 2026-10-09 (voir « Décisions »)
   Quelle opération officielle permet de passer de `CADRAGE` à `ATTENTE` puis à `DEMANDE` ?

4. **Réalisation** — tranché le 2026-10-09 (voir « Décisions »)
   Quelle transition autorise effectivement les modifications applicatives ?

5. **Clôture** — tranché le 2026-10-09 (voir « Décisions »)
   Quelles conditions permettent de passer de `VERIFY` à `CLOTURE`, puis de revenir à `CADRAGE` ?

6. **Périmètre** — tranché le 2026-10-09 (voir « Décisions »)
   Quels fichiers de gouvernance sont autorisés indépendamment du périmètre de réalisation ?

7. **Contrôle de livraison** — tranché le 2026-10-09 (voir « Décisions »)
   Quelles conditions exactes doivent être satisfaites pour autoriser le commit ?

8. **Échec de contrôle** — tranché le 2026-10-09 (voir « Décisions »)
   Quel est le comportement lorsque VERIFY retourne `FAIL`, `ERROR`, `MANUAL` ou `ATTESTED` ?

9. **État runtime** — tranché le 2026-10-09 (voir « Décisions »)
   Quelles informations doivent rester exclusivement dans `state.json` (à créer) et quelles informations doivent rester dans les attentes/contrats versionnés ?

10. **Réversibilité**
    Comment supprimer la gouvernance proprement sans laisser de hook ou de configuration active ?

11. **Démarrage sans état** — tranché le 2026-10-09 (voir « Décisions »)
    Sur un clone neuf (aucun `state.json` (à créer)), DRWIL démarre-t-il en `CADRAGE` avec `attente_active = null` ? Le principe « au démarrage, DRWIL reprend toujours l'état persistant » doit préciser ce cas.

12. **Élargissement du cadrage** (Lot 3) — tranché le 2026-10-09 (voir « Décisions »)
    Un commit qui modifie à la fois le bloc `cadrage` de la fiche active et du code permet à l'agent d'élargir lui-même son périmètre. Faut-il le refuser (cadrage et code en commits séparés), ou seulement le signaler à la relecture ?

---

# Contraintes

* Réutiliser l’architecture DRWIL existante.
* Ne pas créer un second moteur de vérification.
* Ne pas introduire d’agent chargé de surveiller l’agent.
* Ne pas consommer de tokens pour les contrôles mécaniques.
* Ne pas faire confiance aux affirmations du LLM.
* Utiliser l’état runtime persistant comme source de vérité opérationnelle.
* Ne pas versionner `.drwil/state.json` (à créer).
* Ne pas permettre de contournement silencieux.
* Ne pas introduire d’opération destructive silencieuse.
* Préserver la compatibilité avec les contrats et contrôles existants.
* Conserver la réversibilité complète du mécanisme.
* Ne pas transformer `state.json` (à créer) en seconde source de vérité contractuelle.

---

# Hors périmètre

* Dashboard UI.
* Serveur distant ou SaaS.
* Orchestration autonome d’agents.
* Marketplace d’attentes.
* Agent de surveillance d’un autre agent.
* Système complexe de permissions.
* Gestion de plusieurs attentes simultanément.
* Remplacement du moteur `VERIFY`.
* Remplacement du système de contrats existant.
* Versionnement de l’état runtime.

---

# Preuves attendues

Le chantier sera considéré comme correctement réalisé lorsque les preuves suivantes existent :

* `.drwil/state.json` (à créer) possède un schéma valide ;
* l’activité courante peut être déterminée de manière déterministe ;
* l’attente active peut être déterminée de manière déterministe ;
* l’état peut être lu sans dépendre du LLM ;
* le contexte actif peut être réinjecté dans le workflow agent ;
* l’agent reçoit une instruction explicite correspondant à l’activité courante ;
* une modification applicative dans une activité non autorisée est refusée au niveau prévu ;
* une modification hors périmètre est refusée mécaniquement ;
* les contrôles DRWIL existants continuent d’être exécutés ;
* `VERIFY` reste la source du verdict de conformité ;
* le cycle complet a été testé sur un cas réel ;
* la clôture remet proprement l’état runtime à une situation neutre ;
* `.drwil/state.json` (à créer) est ignoré par Git ;
* aucune procédure de contournement silencieux n’est introduite ;
* la gouvernance peut être retirée proprement.

---

# Principe directeur

> **L’agent peut réaliser le travail.
> Il ne peut pas définir seul les conditions dans lesquelles ce travail est considéré comme acceptable.**

Et plus fondamentalement :

> **Ce qui est important ne doit pas dépendre de la mémoire de l’agent.**

> **Le contrat est durable. L’état d’exécution est éphémère.**

> **Au démarrage, DRWIL reprend toujours l'état persistant. Il ne déduit jamais l'état à partir de l'existence ou de la disparition d'une session agent.**




---

## Reprise

- **Dernier état** (2026-10-09) : Lots 1 à 4 commités. Lot 4 : `preuveVerify` dans `.githooks/etat.mjs` — `VERIFY → CLOTURE`
  refusé sans dernière évidence `drwil verify --evidence` au verdict `pass`
  ou `attested`, sur `HEAD`, arbre propre (aussi en mode agent) ; messages
  par verdict (FAIL/ERROR → REALISATION, MANUAL → `drwil attest`) ; règle
  de l'activité VERIFY réinjectée à l'agent ; doc « Clôture sur la preuve
  de `drwil verify` » (fr/en) ; 7 tests.
- **Limites** : un agent autre que Claude Code ne lit l'état que s'il suit
  la consigne d'`AGENTS.md` ; messages de transition et de validation d'état
  en français seulement ; la CI ne contrôle que le périmètre (l'activité est
  locale) ; sur la branche principale elle-même, il n'y a rien à rejouer ;
  l'évidence de verify est hors git, donc falsifiable en local ; tout
  fichier non suivi et non ignoré empêche de clore.
- **Travail non commité** : aucun. Attestations humaines du 2026-10-09
  (SEC-001, QUA-013, SEC-006, QUA-018, QUA-019) commitées après la
  révision du point 6 (attestations hors périmètre) : `drwil verify` donne
  `GOVERNANCE: PASS`.
- **Prochaine étape** : [Humain + IA] Lot 5 — cycle complet sur un cas
  réel. Reste ouvert : point 10 (retrait propre de la gouvernance, Lot 6).
