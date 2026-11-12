# Intention : sept retours du demandeur à traiter en 0.11.2

**Statut** : proposée le 2026-11-12 — retours du demandeur, tous à livrer en 0.11.2. Chacun sera cadré en fiche (`/drwil-start` ne propose que les fiches) ; le fichier garde ici l'énoncé et les décisions à prendre.

## Existant

- Le sondage `drwil-merge` (« Automatic merge » / « Manual merge ») est lu par `.githooks/state-merge.mjs` ; le skill `start-a-workstream` le décrit.
- Le suivi de consommation (`drwil-usage`, `.drwil/usage.jsonl`) ne lit que les sessions de Claude Code.
- Le skill `start-a-workstream` lance un sous-agent par lot (Claude Code et Copilot CLI).
- `drwil init` écrit des lignes d'index et de lots que l'on voit en `[humain]` là où un `[IA]` est attendu (`packages/drwil/src/guarantees-briefs.ts` produit des lignes `[humain]`).
- La priorité d'une fiche est une simple convention (`[P0]` à `[P3]`), sans analyse.

## Besoin

### 1. Mesurer la consommation sur Copilot

Aujourd'hui seul Claude Code est mesuré. Trouver comment recueillir (ou centraliser) la consommation de Copilot CLI et la faire remonter dans `.drwil/usage.jsonl` et le tableau de bord.
- [décision] Source des données Copilot (journaux de session locaux, `session_usage`, autre) et unité comparable aux tokens de Claude Code.
- [décision] Centralisation : un fichier par dépôt (comme aujourd'hui) ou une remontée vers un lieu commun.

### 2. Analyser l'urgence avant de prioriser une fiche

Toujours prioriser une fiche en P0 sans se demander si elle peut attendre. Il faut une analyse qui dit si elle peut attendre ou non.
- [décision] Forme : questions fixes au cadrage (bloque-t-elle un adoptant ? casse-t-elle la CI ? contournement possible ?), ou contrôle de `check-docs`.
- [décision] Où se consigne le résultat (champ de la fiche, ligne de l'index).

### 3. Fichier neuf couvert par la PR

Déjà traité : QUA-173, chantier fusionné par #409. Reste le défaut de couverture cadré dans `docs/projects/couverture-de-closedbriefpatterns-en-ci.md`. Rien d'autre à cadrer ici.

### 4. Fusion automatique par défaut

Retirer le sondage `drwil-merge` : la fusion automatique devient le comportement par défaut.
- Décidé le 2026-11-12 : inconditionnelle, sans réglage pour la refuser ; les sondages `drwil-merge` et `drwil-scope` disparaissent.
- [décision] QUA-163 (sans réponse « Automatic merge », rien n'est programmé) est modifié par ce choix, validé par le demandeur : reste à écrire ce qui le remplace (garde-fous qui demeurent : PR de la branche, CI verte, vérification relue sur la forge).

### 5. Relecteur critique, ou test de qualité et fonctionnel

Un skill ou un relecteur de code critique, sans être trop astreignant, compatible avec l'objectif « full auto ».
- [décision] Forme : skill de relecture avant clôture (avis, non bloquant), test fonctionnel du critère, ou les deux.
- [décision] Bloquant ou consultatif ; modèle et coût acceptables.

### 6. `init` : transitions en [humain] au lieu de [IA]

`drwil init` écrit des transitions ou des lignes marquées `[humain]` qui devraient être `[IA]`.
- À reproduire d'abord : quelle sortie de `init` exactement (lignes d'index de `packages/drwil/src/guarantees-briefs.ts` ?), sur quel type de projet.

### 7. `start` et les sous-agents

- **7a** : `state.mjs start` échoue en silence quand l'arbre de travail est sale. Il doit dire pourquoi, et ce qu'il faut faire.
- **7b** : arrêter de travailler en sous-agent, qui semblerait plus consommateur.
  - Décidé le 2026-11-12 : supprimer les sous-agents du skill `start-a-workstream` maintenant, sans mesure préalable ; le chantier se fait dans la session principale.
  - Cette règle de l'`AGENTS.md` change, validée par le demandeur : un lot par session ou par `lot next` reste à décider (reprise via « Reprise » de la fiche).

## Questions à trancher

- [décision] Les décisions de chaque point (1, 2, 4, 5, 7b) sont listées avec le point, ci-dessus ; une fiche se cadre dès que les siennes sont tranchées.
