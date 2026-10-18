# Projet : une clôture allégée, sans encombrants (0.6.5)

**Statut** : cadré le 2026-10-18.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/date-ia-first-installateur.md`

<!-- scope
files:
  - packages/drwil/src/render.ts
  - packages/drwil/src/index.ts
  - packages/drwil/src/migration.ts
  - packages/drwil/src/manifest.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/test/migration.test.mjs
  - outils/installer-depot.mjs
  - outils/installer-depot.test.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
  - packages/drwil/templates/common/base/.githooks/consumption.mjs
  - packages/drwil/templates/common/base/.githooks/detour.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - .githooks/state.test.mjs
  - .githooks/detour.test.mjs
  - .githooks/scope-gate.test.mjs
  - .githooks/close.test.mjs
  - .githooks/check-docs.test.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/docs/recipes/create-a-release.md
  - docs/recipes/create-a-release.md
  - docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/docs/recipes/corriger-un-defaut.md
  - docs/recipes/corriger-un-defaut.md
  - packages/drwil/templates/common/base/AGENTS.md
  - AGENTS.md
  - .github/scripts/workflows-yaml.test.mjs
  - .github/scripts/ci-multi-os.test.mjs
  - docs/ia-first.md
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - outils/miroirs.json
  - packages/drwil/CHANGELOG.md
-->

(cadrage : le rendu et la mise à jour du paquet pour la date ;
l'installateur du dépôt ; l'état, une commande de clôture nouvelle
(close.mjs, à créer) et `check-docs` dans le gabarit, avec leurs tests propres au
dépôt ; le hook et la skill de lancement pour l'ordre de la file ; les
recettes de clôture et de release (gabarit, et copies du dépôt qui en
diffèrent) ; `AGENTS.md` ; les deux tests qui citent une fiche supprimée ;
la commande de détour (detour.mjs, à créer), la barrière de périmètre
qui la reconnaît et la recette « corriger un défaut » ;
`docs/ia-first.md`, rendu une dernière fois ; la carte, le registre, les
contrôles, les miroirs et le changelog. Le hook de sondage n'a pas pu être
lu au cadrage : sa liste de tests est à compléter en BUILD si besoin.)

## 1. Besoin

Décidé le 2026-10-18 par le demandeur, après la 0.6.4 : la clôture d'un
chantier coûte des gestes et des reprises qui ne servent pas la qualité.
Relevés dans la session de la 0.6.4 (deux chantiers menés en file par
sous-agents) et dans les intentions ouvertes :

1. **La date qui change** : `npm run installer-depot` réécrit la date de
   `docs/ia-first.md` à chaque lancement (vérifié le 2026-10-18 : seul
   fichier à écrire), un faux changement à annuler à la main ou qui pollue
   le commit. Le gabarit rend `{{date}}` à la date du jour
   (`packages/drwil/src/render.ts`) ; une mise à jour d'un projet
   utilisateur risque le même bruit (à vérifier en BUILD).
2. **Le critère « contrat à créer »** : une fois le contrat créé, `verify`
   reste en FAIL tant que la fiche ne cite pas son ID. L'agent du chantier
   YAML en a fait un commit séparé, que rien n'impose (une fiche se commite
   toujours, `.githooks/scope-gate.mjs`) : il manque le signal qui dit quoi
   écrire et où.
3. **Les références à une fiche supprimée** : la clôture supprime la fiche,
   mais du code et d'autres fiches la citent ; en CLOSING, aucun fichier de
   code ne peut changer. Deux commentaires de test sont restés faux
   (`.github/scripts/workflows-yaml.test.mjs`,
   `.github/scripts/ci-multi-os.test.mjs`) ; la fiche de la release a dû
   être corrigée à la main.
4. **Des noms de fichiers sans chemin au journal** : refusés par
   `check-docs` au commit de clôture, d'où une reprise.
5. **Les branches locales jamais supprimées** : la recette le demande,
   aucun outil ne le fait ; 53 branches fusionnées accumulées.
6. **L'ordre de la file** : la file a suivi l'ordre des clics dans le
   sondage, pas celui des options, que décrit la skill ; il a fallu arrêter
   la file et relancer le sondage.
7. **Le feu vert de publication** : un sous-agent ne peut pas le demander ;
   la recette de release ne prévoit pas de le donner au lancement.
8. **La correction intercalée** (ajouté le 2026-10-18 par le demandeur) :
   en plein chantier, un défaut préalable hors du cadrage oblige l'agent à
   élargir un cadrage sans rapport ou à s'arrêter ; il improvise alors
   stash, allers-retours de branche et retours en cadrage à la main.

## Critères d'acceptation

- Installer ou mettre à jour ne réécrit pas un document dont seule la date
  changerait : la date d'origine est gardée, une nouvelle date n'est écrite
  que si le reste du document change — contrat à créer
- Une commande de clôture fait la mécanique d'un geste — fiche supprimée,
  ligne d'index retirée, consommation consignée — et signale avant le
  commit ce qui ferait échouer la clôture : critère encore « contrat à
  créer » (avec l'ID à écrire), références qui deviendraient mortes, noms
  de fichiers sans chemin ; les branches locales déjà fusionnées sont
  supprimées au lancement du chantier suivant (`git branch -d`, jamais une
  branche non fusionnée) — contrat à créer
- Un fichier de code cite le contrat qu'il sert, jamais une fiche de
  chantier : signalé dès le BUILD, quand on peut encore le corriger —
  contrat à créer
- La file suit l'ordre des options du sondage, quel que soit l'ordre des
  clics — `QUA-037`
- En plein chantier, l'agent ouvre seul un détour pour un défaut hors du
  cadrage : le travail en cours est mis de côté et restauré par l'outil
  (jamais perdu), la correction passe par sa propre branche partie de la
  branche principale, sa fiche courte (correction et son test), sa PR
  marquée « détour de <fiche> » au mode de fusion décidé au lancement, et
  son entrée de journal ; à la reprise, la branche du chantier part de la
  branche principale corrigée et l'état revient en BUILD sur la fiche
  d'origine. Un détour qui changerait un contrat existant, un hook, un
  seuil ou la barrière demande le oui de l'humain ; en file, le
  sous-agent s'arrête alors — contrat à créer
- La recette de release permet de donner le feu vert de publication au
  lancement, pour qu'une file menée par sous-agents publie sans s'arrêter ;
  sans ce feu vert, la publication reste un geste après accord — `QUA-040`

## 2. Hors périmètre

- La fiche de recette pour une équipe hors dépôt : PR séparée, décidée le
  2026-10-18 (`docs/intentions/fiche-de-recette.md`).
- La rédaction de l'entrée du journal et des limites : elle reste à
  l'agent, la commande n'écrit que la mécanique.
- Supprimer les branches distantes : GitHub les supprime à la fusion.
- La release 0.6.5 elle-même : sa propre fiche, comme les précédentes.

## 3. Contraintes

- Livré à tout projet (QUA-018, dépôt ou livrable : le demandeur a validé
  le livrable avec le dépôt le 2026-10-18) : on édite le gabarit, puis
  `npm run installer-depot` ; jamais une copie installée.
- La commande de clôture ne fusionne rien, ne pousse rien et n'écrit pas
  `.drwil/state.json` (si présent) à la main : elle passe par les fonctions de l'état.
- La suppression de branche ne touche que des branches déjà fusionnées
  dans la branche principale, jamais la branche courante.
- Hooks à 100 % de couverture (QUA-004, seuil de couverture de test) ;
  fichiers de code sous 400 lignes (QUA-001) : la commande de clôture est
  un fichier à part, pas un ajout à `.githooks/state.mjs`.
- L'ordre de la file : reproduire d'abord (cause racine, recette
  `docs/recipes/corriger-un-defaut.md`), puis corriger.
- Mesurer le gain : comparer la consommation de ce chantier et des deux
  suivants à celle des clôtures de la 0.6.4 (`.drwil/usage.jsonl`).

## 4. Décisions

- **2026-10-18 — Une seule PR pour la 0.6.5** (demandeur) : irritants du
  cycle et clôture outillée ensemble.
- **2026-10-18 — La date d'origine est gardée** (demandeur, sur
  recommandation de l'agent) : réécrite seulement si le reste du document
  change ; la date n'est pas retirée. Tranche l'intention
  `docs/intentions/date-ia-first-installateur.md`.
- **2026-10-18 — La fiche active reste commitable avec le code**
  (constaté au cadrage : c'est déjà le cas) ; le gain vient du signal de la
  commande de clôture, pas d'un changement de la barrière.
- **2026-10-18 — Le code cite le contrat, pas la fiche** (demandeur, sur
  recommandation de l'agent).
- **2026-10-18 — Un détour s'ouvre sans demander** (demandeur : « l'humain
  répondra forcément oui ») : le contrôle est à la fusion de sa PR, pas à
  son ouverture. Exception, sur recommandation de l'agent : un détour qui
  change les règles du jeu (contrat existant, hook, seuil, barrière)
  demande le oui de l'humain ; en file, le sous-agent mène seul un détour
  ordinaire et s'arrête sur l'exception.
- **2026-10-18 — Le travail en cours mis de côté par l'outil** (agent) :
  un stash nommé, enregistré dans l'état et restauré par la commande de
  reprise, jamais à la main ; la commande refuse de reprendre si la
  restauration échoue, sans rien perdre.
- Contrats concernés : quatre contrats créés (détour en plus) (date, clôture outillée,
  référence de code), QUA-037 (une file de chantiers décidée d'un geste),
  QUA-040 (drwil entretient la carte, le README et le changelog), QUA-016
  (rappel de cadrage), QUA-019 (pas de contournement : le détour n'élargit
  jamais le cadrage de la fiche d'origine), QUA-017 (pas de travail direct sur la branche
  principale), QUA-018 (dépôt ou livrable), QUA-004 et QUA-001.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — la date** [IA] : rendu qui garde la date d'origine, à
  l'installation du dépôt comme à la mise à jour d'un projet.
- **Lot 2 — l'ordre de la file** [IA] : reproduit, cause établie, corrigé.
- **Lot 3 — la clôture outillée** [IA] : la commande de clôture, suppression des
  branches fusionnées au lancement suivant, contrôle des références de code,
  recettes et `AGENTS.md`.
- **Lot 4 — le feu vert de publication** [IA] : recette de release.
- **Lot 5 — le détour** [IA] : ouverture, mise de côté, reprise ; barrière
  qui accepte le commit de la correction sous sa fiche de détour ;
  recette « corriger un défaut » et `AGENTS.md`.
  Critère de sortie de chaque lot : `node .githooks/run-checks.mjs` vert ;
  du chantier : `drwil verify --agent` en `GOVERNANCE: PASS`, et sa propre
  clôture faite avec la nouvelle commande.

## 7. Reprise

- **Dernier état** (2026-10-18) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
