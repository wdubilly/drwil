# Projet : personnaliser docs/architecture.md du dépôt

**Statut** : cadré le 2026-10-11 — décision prise, lot 1 à lancer.
**Risque** : MEDIUM

<!-- cadrage
fichiers:
  - docs/architecture.md
  - outils/miroirs.json
-->

(cadrage : ce dépôt seulement — QUA-018 (périmètre explicite : dépôt drwil
vs livrable gabarit) : le modèle livré ne change pas ; la copie du dépôt,
une fois personnalisée, devient un écart déclaré du contrôle des miroirs.)

## 1. Besoin

Vague 1 de la feuille de route (`docs/projets/en-attente.md`).
`docs/architecture.md` du dépôt est resté au modèle rendu à l'installation
(« (à décrire : ce que fait l'application, pour qui) », état au
2026-10-04) : il ne dit ni ce qu'est drwil, ni où vivent le paquet, les
hooks, le gabarit et les outils. Contrats candidats réalisés : v1:DOC-005,
v1:ARC-001 (`docs/intentions/catalogue-cycle-de-vie.md`).

## 2. Hors périmètre

- Le modèle livré (`packages/drwil/templates/fr/base/docs/architecture.md`).
- Les décisions d'architecture à venir (vague 3) : la carte décrit
  l'existant ; elle évoluera dans le même commit que le code qu'elle décrit.

## 3. Contraintes

- Une information, une seule source : la carte renvoie aux documents qui
  détaillent (`docs/ia-first.md`, `docs/contrats.md`, fiches), sans les
  recopier.
- Faits relevés dans le code au moment de l'écrire, datés.

## 4. Décisions

- **2026-10-11 — Maintenant, carte actuelle** : une carte courte de
  l'existant plutôt que d'attendre la fin des restructurations. [décision
  utilisateur]

## 5. Points à trancher

- ~~Maintenant ou à la fin~~ — tranché le 2026-10-11 (voir « Décisions »).

## 6. Lots

- **Lot 1 — carte du dépôt** [IA] : ce qu'est drwil et pour qui ; carte
  (paquet `packages/drwil` : CLI, moteur de vérification, gabarit FR/EN ;
  hooks `.githooks/` ; outils propres au dépôt `outils/` ; CI ; documents
  de gouvernance) ; écart déclaré dans `outils/miroirs.json`. Critère de
  sortie : chaque chemin cité existe (QUA-011, doc jamais fausse),
  contrôle des miroirs vert.

## 7. Reprise

- **Dernier état** (2026-10-11) : lot 1 réalisé (carte du dépôt, écart
  déclaré dans `outils/miroirs.json`).
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] `drwil verify`, clôture et fusion automatique
  (autorisée au lancement).
