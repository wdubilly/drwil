# Projet : une clôture allégée, sans encombrants (0.6.5, 3 sur 4)

**Statut** : cadré le 2026-10-18 ; découpé le même jour en quatre fiches.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - .githooks/close.mjs
  - .githooks/close.test.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - .githooks/state.mjs
  - .githooks/state-cli.mjs
  - .githooks/state-texts.mjs
  - .githooks/state.test.mjs
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - .githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
  - .githooks/check-docs.mjs
  - .githooks/check-docs.test.mjs
  - packages/drwil/templates/common/base/.githooks/check-code-rules.mjs
  - .githooks/check-code-rules.mjs
  - .githooks/check-code-rules.test.mjs
  - packages/drwil/templates/common/base/.githooks/consumption.mjs
  - .githooks/consumption.mjs
  - .githooks/consumption.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/AGENTS.md
  - AGENTS.md
  - packages/drwil/test/kit.test.mjs
  - .github/scripts/workflows-yaml.test.mjs
  - .github/scripts/ci-multi-os.test.mjs
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - outils/miroirs.json
  - packages/drwil/CHANGELOG.md
-->

(cadrage : la commande de clôture (close.mjs, à créer), l'état, la liste
des fiches, `check-docs`, le contrôle des règles de code (référence à une
fiche dans le code) et la consommation — gabarit et copies du dépôt, avec
leurs tests propres au dépôt — ; la recette de clôture et `AGENTS.md` ;
les deux tests qui citent une fiche supprimée ; la carte, le registre,
les contrôles, les miroirs et le changelog.)

## 1. Besoin

Décidé le 2026-10-18 par le demandeur, après la 0.6.4 : la clôture d'un
chantier coûte des gestes et des reprises qui ne servent pas la qualité.
Relevés dans la session de la 0.6.4 (deux chantiers menés en file par
sous-agents) et dans les intentions ouvertes. Cette fiche couvre la
clôture elle-même ; les autres points ont leur fiche (section 2).

1. **Le critère « contrat à créer »** : une fois le contrat créé, `verify`
   reste en FAIL tant que la fiche ne cite pas son ID. L'agent du chantier
   YAML en a fait un commit séparé, que rien n'impose (une fiche se commite
   toujours, `.githooks/scope-gate.mjs`) : il manque le signal qui dit quoi
   écrire et où.
2. **Les références à une fiche supprimée** : la clôture supprime la fiche,
   mais du code et d'autres fiches la citent ; en CLOSING, aucun fichier de
   code ne peut changer. Deux commentaires de test sont restés faux
   (`.github/scripts/workflows-yaml.test.mjs`,
   `.github/scripts/ci-multi-os.test.mjs`) ; la fiche de la release a dû
   être corrigée à la main.
3. **Des noms de fichiers sans chemin au journal** : refusés par
   `check-docs` au commit de clôture, d'où une reprise.
4. **Les branches locales jamais supprimées** : la recette le demande,
   aucun outil ne le fait ; 53 branches fusionnées accumulées.

## Critères d'acceptation

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

## 2. Hors périmètre

- La date gardée et le feu vert de publication :
  `docs/projects/date-gardee-feu-vert.md`.
- L'ordre de la file : `docs/projects/ordre-de-la-file.md`.
- Le détour : `docs/projects/detour.md`.
- La fiche de recette pour une équipe hors dépôt :
  `docs/projects/fiche-de-recette.md`.
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
- Mesurer le gain : comparer la consommation de ce chantier et des deux
  suivants à celle des clôtures de la 0.6.4 (`.drwil/usage.jsonl`).

## 4. Décisions

- **2026-10-18 — Une PR par fiche** (demandeur) : la décision « une seule
  PR » portait sur le cadrage de la 0.6.5, pas sur sa réalisation ; la
  fiche est découpée en quatre, réalisées dans l'ordre : date et feu vert,
  ordre de la file, clôture outillée, détour.
- **2026-10-18 — La fiche active reste commitable avec le code**
  (constaté au cadrage : c'est déjà le cas) ; le gain vient du signal de la
  commande de clôture, pas d'un changement de la barrière.
- **2026-10-18 — Le code cite le contrat, pas la fiche** (demandeur, sur
  recommandation de l'agent).
- Contrats concernés : deux contrats créés (clôture outillée, référence
  de code), QUA-016 (rappel de cadrage), QUA-018 (dépôt ou livrable),
  QUA-004 et QUA-001.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — la commande de clôture** [IA] : mécanique et signaux avant
  le commit.
- **Lot 2 — les branches fusionnées** [IA] : supprimées au lancement du
  chantier suivant.
- **Lot 3 — le code cite le contrat** [IA] : contrôle dès le BUILD ;
  les deux commentaires de test corrigés.
- **Lot 4 — la doc** [IA] : recette de clôture et `AGENTS.md`.
  Critère de sortie de chaque lot : `node .githooks/run-checks.mjs` vert ;
  du chantier : `drwil verify --agent` en `GOVERNANCE: PASS`, et sa propre
  clôture faite avec la nouvelle commande.

## 7. Reprise

- **Dernier état** (2026-10-18) : cadré et découpé, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`),
  après l'ordre de la file.
