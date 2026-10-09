# Projet : petite correction sous barrière bloquante

**Statut** : ouvert le 2026-10-09 — en attente de décision.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - packages/drwil/templates/common/base/.githooks/etat.mjs
  - .githooks/etat.mjs
-->

(cadrage provisoire : dépend de la décision ; à confirmer au démarrage.)

## 1. Besoin

Le 2026-10-09, corriger une ligne de `README.md` après la clôture d'une
attente a demandé trois transitions humaines dans un terminal (ouvrir
l'attente, lancer la réalisation, clore), plus le retour en CADRAGE d'une
autre attente déjà ouverte. Un projet réglé en `barriere: bloquant` paie
ce coût pour chaque correction mineure. En `avertissement` (défaut du
gabarit), la correction passe avec un simple signalement.

Piste évoquée : une attente légère d'entretien courant (rattachée à
`docs/projets/entretien-courant.md` (si présent)), rouvrable en une seule
transition humaine.

## 2. Hors périmètre

- Affaiblir la décision humaine des transitions qui ouvrent des droits.

## 3. Contraintes

- Garder le principe : l'agent ne définit pas seul ce qui est acceptable.

## 4. Décisions

(aucune encore)

## Contrats concernés

- **QUA-016** — Rappel de cadrage : le périmètre d'une correction mineure
  doit rester borné.
- **QUA-019** — Pas de contournement d'un contrôle : la voie légère doit
  être un chemin prévu, pas un contournement.

## 5. Points à trancher

- [décision] Faut-il une voie légère ? Si oui : quel périmètre (doc
  seulement ?), quelle transition humaine unique, quelle clôture ?

## 6. Lots

- **Lot 1 — à définir après décision** [décision].

## 7. Reprise

- **Dernier état** (2026-10-09) : fiche ouverte, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] trancher le point 5.
