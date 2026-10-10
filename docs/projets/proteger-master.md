# Projet : protéger master — checks obligatoires, CODEOWNERS, identité de l'agent

**Statut** : cadré le 2026-10-10 — lots 1, 2 et 4 faits ; lot 3 [humain] (compte machine) à faire.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - .github/CODEOWNERS
  - .github/ruleset-master.json
  - .github/scripts/verifier-ruleset.mjs
  - .github/workflows/ia-first.yml
-->

(cadrage : drwil-le-dépôt seulement — QUA-018 (périmètre explicite : dépôt
drwil vs livrable gabarit). Livrer un CODEOWNERS ou un ruleset dans le
gabarit est une autre question, posée dans
`docs/intentions/fabrique-autonome.md`.)

## 1. Besoin

Étape 0 de l'intention « fabrique autonome »
(`docs/intentions/fabrique-autonome.md`) : faire passer la triche de
« détectable » à « impossible sans humain », par la forge plutôt que par
des contrôles que l'agent peut lire et modifier.

Constat du 2026-10-10 :

- le dépôt est **public** (depuis le 2026-10-09) : la protection de branche
  et les rulesets sont disponibles sans plan payant ;
- `master` n'est **pas protégé** (API : « Branch not protected »), aucun
  ruleset, aucun CODEOWNERS ;
- QUA-017 (pas de travail direct sur la branche principale) ne tient qu'en
  local (`pre-push`), que le saut des hooks ou l'API GitHub
  court-circuitent ;
- l'agent agit avec le jeton `gh` du mainteneur (il a fusionné les PR #11
  à #14 ce jour-là) : pour GitHub, agent et humain sont **la même
  identité**. Une revue obligatoire ne protège donc rien contre l'agent
  tant qu'il n'a pas sa propre identité.

## 2. Hors périmètre

- Tout contrôle nouveau dans `.githooks/` ou la CI.
- Le gabarit distribué (QUA-018) : pas de CODEOWNERS ni de ruleset livré
  aux projets adoptants dans ce chantier.
- L'auto-fusion (changement de doctrine, voir l'intention).

## 3. Contraintes

- Mainteneur seul : GitHub interdit d'approuver sa propre PR. Exiger une
  revue (ou celle des code owners) bloquerait toute fusion tant que
  l'agent n'a pas d'identité distincte.
- Les checks exigés doivent exister sur **chaque** PR : `checks`,
  `kit-tests (ubuntu-latest)`, `kit-tests (windows-latest)`,
  `kit-tests (macos-latest)`. Si `docs/projets/ci-matrice-sur-pr.md`
  change les noms ou les déclencheurs, mettre le ruleset à jour dans le
  même chantier.
- Branche à jour exigée (strict) : la CI juge l'état réellement fusionné ;
  coût accepté : remettre une PR à jour après chaque fusion.
- Aucune liste de contournement (bypass) : même l'administrateur, donc
  l'agent qui utilise son jeton, passe par une PR verte.

## 4. Décisions

- **2026-10-10 — Commencer par la forge** : la protection de master passe
  avant le mutation testing, meilleur rapport gain/effort, sans code.
  [décision utilisateur : « prépare la liste des réglages de protection de
  master et rédige l'intention ou le chantier »]

- **2026-10-10 — Compte machine pour l'agent** (point 5) : un compte
  GitHub dédié, collaborateur en écriture sans droit d'administration ;
  ses PR et fusions sont distinctes de celles du mainteneur, qui peut
  donc les approuver. Un jeton à portée fine agirait toujours au nom du
  mainteneur. [décision utilisateur]
- **2026-10-10 — Ruleset versionné et vérifié en CI** (point 5) : le
  ruleset appliqué est gardé en JSON sous `.github/` ; la CI le compare à
  celui de GitHub et échoue s'ils divergent. [décision utilisateur]
- **2026-10-10 — Fusion d'une PR HIGH : règle actuelle** (point 5) : déjà
  tranché par la fusion autorisée au lancement (voir
  `docs/projets/journal.md`) : l'agent ne fusionne que si l'humain l'a
  autorisé au lancement, tous niveaux de risque. [décision utilisateur]

## Contrats concernés

- **QUA-017** — Pas de travail direct sur la branche principale : garanti
  côté forge, plus seulement en local.
- **QUA-019** — Pas de contournement : sans bypass, ni le saut des hooks
  ni l'API ne permettent plus d'atterrir sur master sans CI verte.
- **QUA-013** — Contrôle non exécuté n'est pas passé : un check exigé qui
  ne tourne pas bloque la fusion.

## 5. Points à trancher

- ~~Les trois points~~ — tranchés le 2026-10-10 (voir « Décisions »).

## 6. Lots

- **Lot 1 — ruleset sur master** [humain] : **fait le 2026-10-10**
  (ruleset « master protégé », sans contournement). Réglages appliqués : Critère de sortie : un push direct sur `master` est refusé
  par GitHub ; une PR sans CI verte ne peut pas être fusionnée.
  Réglages (Settings → Rules → Rulesets → New branch ruleset) :
  - cible : branche par défaut ; application : active ; bypass : aucun ;
  - « Restrict deletions » et « Block force pushes » ;
  - « Require a pull request before merging » : 0 approbation (mode
    solo), « Dismiss stale approvals », « Require conversation
    resolution » ;
  - « Require status checks to pass » : les quatre checks listés en
    contraintes, « Require branches to be up to date ».
- **Lot 2 — CODEOWNERS** [IA] : `.github/CODEOWNERS` (à créer), le
  mainteneur propriétaire de `.githooks/`, `.claude/`,
  `.drwil/ia-first.json`, `.github/`, `docs/contrats.md`,
  `packages/drwil/templates/common/`. Sans effet bloquant tant que la
  revue des code owners n'est pas exigée (mode solo) : il documente les
  zones sensibles et sert dès que l'agent a son identité. Critère de
  sortie : GitHub reconnaît le fichier (aucune erreur signalée sur la PR),
  contrôles et CI verts.
- **Lot 3 — compte machine** [humain] : créer le compte de l'agent,
  l'inviter en écriture (sans admin), lui donner un jeton, configurer
  `gh` de l'agent avec ; puis ruleset à 1 approbation et « Require review
  from Code Owners ». Conséquence : une PR qui touche une zone sensible
  demandera l'approbation du mainteneur, même si la fusion a été autorisée
  au lancement. Critère de sortie : une PR de l'agent qui touche
  `.githooks/` ne peut pas être fusionnée sans l'approbation du
  mainteneur.
- **Lot 4 — ruleset versionné** [IA] : contenu du ruleset appliqué dans
  `.github/ruleset-master.json` (à créer), script de comparaison
  `.github/scripts/verifier-ruleset.mjs` (à créer), étape de CI dans
  `.github/workflows/ia-first.yml`. Critère de sortie : la CI échoue si le
  ruleset de GitHub diffère du fichier, passe sinon ; un changement de
  protection passe par une PR.

## 7. Reprise

- **Dernier état** (2026-10-10) : lots 1, 2 et 4 faits.
  - Lot 2 : `.github/CODEOWNERS`, lu par GitHub sans erreur ; sans effet
    bloquant tant que la revue des code owners n'est pas exigée.
  - Lot 4 : `.github/ruleset-master.json` (ruleset tel que GitHub le
    renvoie) ; `.github/scripts/verifier-ruleset.mjs` compare à l'API
    (0 si conforme, 1 si un paramètre diverge, vérifié en local) ; étape du
    job `checks` : le jeton de CI lit bien les rulesets (CI de la PR #29
    verte, « conforme »).
- **Prochaine étape** : [humain] lot 3 — créer le compte machine de
  l'agent, l'inviter en écriture sans admin, lui donner un jeton,
  configurer le `gh` de l'agent ; puis ruleset à 1 approbation et revue
  des code owners, via `--ecrire` et une PR.
