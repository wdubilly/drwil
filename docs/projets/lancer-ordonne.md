# Projet : /drwil-lancer propose les fiches dans le bon ordre

**Statut** : cadré le 2026-10-10 — décisions à prendre avant le lot 1.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - .githooks/etat.mjs
  - .githooks/etat.test.mjs
  - packages/drwil/templates/common/base/.githooks/etat.mjs
  - packages/drwil/templates/common/base/.githooks/etat.test.mjs
  - .claude/skills/lancer-un-chantier/SKILL.md
  - packages/drwil/templates/fr/tools/claude/.claude/skills/lancer-un-chantier/SKILL.md
  - packages/drwil/templates/en/tools/claude/.claude/skills/start-a-chantier/SKILL.md
  - packages/drwil/templates/fr/base/docs/ia-first.md
  - packages/drwil/templates/en/base/docs/ia-first.md
  - packages/drwil/test/kit.test.mjs
-->

(cadrage : la liste des fiches lançables (`etat.mjs fiches`), le skill de
lancement et sa doc, côté dépôt et côté gabarit — QUA-018 (périmètre
explicite : dépôt drwil vs livrable gabarit).)

## 1. Besoin

Constaté le 2026-10-10 : le sondage de `/drwil-lancer` liste les fiches
cadrées sans ordre ni état de préparation ; la recommandation repose sur la
mémoire et le jugement de l'agent. Le demandeur a demandé si les intentions
ne devraient pas aussi compter : oui. Ce jour-là, sur dix fiches cadrées,
une seule était réellement prête (aucune décision ouverte) ; plusieurs
avaient encore des `[décision]` en attente ; et l'intention
`docs/intentions/fabrique-autonome.md` fixe un ordre (forge, puis
outillage, puis preuves) qu'aucune fiche ne porte.

Intention : que le sondage propose les fiches dans un ordre justifié, sans
dépendre de ce dont l'agent se souvient :

1. **priorité** de l'index (`[P0]` à `[P3]`, `[P2]` par défaut) ;
2. **préparation** : une fiche dont la section « Points à trancher » a
   encore des `[décision]` ouvertes est signalée « non prête » (à trancher
   d'abord) ;
3. **ordre des intentions** : les sections « Ordre proposé » des
   intentions placent une fiche avant une autre ;
4. une intention P1 encore non cadrée peut être signalée comme « à cadrer »
   plutôt qu'une fiche moins prioritaire lancée.

## 2. Hors périmètre

- Le mécanisme de lancement lui-même (sondage lu par un hook, terminal) :
  inchangé.
- Le choix reste humain : l'ordre est une recommandation, jamais une
  présélection (le hook refuse toujours un sondage pré-rempli).

## 3. Contraintes

- Agnostique : ce qui se calcule (priorité, décisions ouvertes) vit dans
  `.githooks/etat.mjs` (`fiches --json`), pas dans un seul outil.
- Les marqueurs existent déjà : priorité et `[décision]` dans l'index
  (`docs/projets/en-attente.md`), `[décision]` dans les fiches ; ne pas en
  inventer d'autres sans nécessité.
- Le sondage de Claude Code n'affiche que quatre options : l'ordre décide
  de ce qui est montré.

## 4. Décisions

- **2026-10-10 — Fiche à part** : le sondage ordonné est un chantier
  distinct de « une fiche terminée ne reste pas » (option b du
  demandeur). [décision utilisateur]

## Contrats concernés

- **QUA-015** — Chantiers exploitables à froid : l'ordre de réalisation se
  relit sur disque, pas dans la mémoire de l'agent.

## 5. Points à trancher

- [décision] **Critère d'ordre** : priorité d'abord, puis préparation, puis
  ordre des intentions ? Ou préparation d'abord (une fiche prête P2 avant
  une fiche P1 bloquée) ? Proposition : fiches prêtes d'abord, puis par
  priorité, l'ordre des intentions départageant.
- [décision] **Fiches non prêtes** : les montrer en fin de sondage avec
  « à trancher d'abord », ou les masquer ? Proposition : les montrer, la
  description dit quoi trancher.
- [décision] **Ordre des intentions** : calculé par `.githooks/etat.mjs` (lecture
  des sections « Ordre proposé », fragile si le format varie) ou laissé au
  jugement de l'agent, qui lit ces sections selon la consigne du skill ?
  Proposition : consigne du skill d'abord ; calcul seulement si la consigne
  ne suffit pas.
- [décision] **Intentions à cadrer** : les signaler dans le message qui
  accompagne le sondage, ou pas du tout ?

## 6. Lots

- **Lot 1 — fiches enrichies** [IA] : `etat.mjs fiches --json` ajoute la
  priorité, le nombre de décisions ouvertes et un champ « prête » ; tri
  selon la décision. Critère de sortie : tests (priorité lue dans
  l'index, `[P2]` par défaut ; décisions ouvertes comptées ; tri) ; dépôt
  et gabarit identiques.
- **Lot 2 — skill et doc** [IA] : le skill de lancement (fr, en) utilise
  ces champs, recommande la première fiche prête avec sa raison, et suit
  la décision sur les intentions ; doc « Lancer et clore » à jour.
  Critère de sortie : un sondage réel propose les fiches dans l'ordre
  attendu ; contrôles et CI verts.

## 7. Reprise

- **Dernier état** (2026-10-10) : fiche cadrée, rien de réalisé.
- **Travail non commité** : la fiche et sa ligne d'index.
- **Prochaine étape** : [décision] trancher les quatre points ; [IA]
  commit de cadrage ; [humain] `/drwil-lancer`.
