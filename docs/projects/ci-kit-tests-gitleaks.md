# Projet : gitleaks dans les tests du kit en CI (suite de « sécuriser le moteur »)

**Statut** : cadré le 2026-10-14 — lot 1 fait (à valider en CI sur la PR 79).
**Risque** : HIGH

<!-- scope
files:
  - .github/workflows/ia-first.yml
-->

## 1. Besoin

Constaté le 2026-10-14 sur la PR 79 : le job `kit-tests` (Linux, macOS,
Windows) échoue sur 18 tests. Les tests du paquet lancent `run-checks` dans
des projets temporaires ; depuis le durcissement de QUA-013 (contrôle non
exécuté), l'absence de gitleaks (contrôle des secrets) y est un échec, alors
que ce job n'installe pas gitleaks (seul le job `checks` l'installe).

## 2. Hors périmètre

- Le comportement de `run-checks` : l'échec est voulu (QUA-013).
- La CI livrée aux projets (déjà faite, gabarit GitHub et GitLab).

## 3. Contraintes

- Contrats concernés : QUA-013, QUA-019 (aucun contournement : on installe
  l'outil, on ne désactive pas le contrôle).
- Version et empreintes épinglées (gitleaks 8.21.2), archive vérifiée par
  sha256 avant extraction, sur les trois systèmes.

## 4. Décisions

- **2026-10-14** : installer gitleaks dans le job `kit-tests` sur les trois
  systèmes, plutôt que simuler gitleaks dans les tests (une simulation
  masquerait le comportement réel).

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — installer gitleaks dans `kit-tests`** [IA] : étape bash
  multi-OS (archive et empreinte par système), ajoutée au PATH. Critère de
  sortie : `kit-tests` vert sur les trois systèmes dans la PR 79.

## 7. Reprise

- **Dernier état** (2026-10-14) : cadré, rien de commencé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] lot 1, après `/drwil-start` par le demandeur.
