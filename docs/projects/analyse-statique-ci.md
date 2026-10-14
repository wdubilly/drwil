# Projet : analyse statique du code en CI (CodeQL)

**Statut** : cadré le 2026-10-14 — à lancer.
**Risque** : HIGH

<!-- scope
files:
  - .github/workflows/codeql.yml
  - .github/ruleset-master.json
  - docs/contracts.md
  - docs/architecture.md
-->

## 1. Besoin

Aujourd'hui la CI contrôle les dépendances (SEC-006, `npm audit`) et les
secrets (gitleaks), pas le code de drwil lui-même. drwil écrit et supprime
des fichiers sur disque et lance des commandes : une analyse statique
(CodeQL, JavaScript et TypeScript) détecte injections de commande,
traversées de chemin et regex vulnérables sur tout le code, sur chaque PR.

## 2. Hors périmètre

- Les gabarits livrés aux projets (la CI du kit livrée reste inchangée).
- Dependabot (mises à jour automatiques) : fiche séparée si voulue.

## 3. Contraintes

- Dépôt public : CodeQL gratuit (vérifié le 2026-10-14).
- Contrats concernés : QUA-013 (un contrôle non exécuté n'est pas passé),
  QUA-019 (pas de contournement).
- Actions GitHub épinglées par version, comme le reste de la CI.
- Le ruleset de master exige les contrôles par nom : tout nouveau contrôle
  bloquant doit y être ajouté.

## 4. Décisions

(aucune pour l'instant)

## 5. Points à trancher

- [IA] Bloquer la fusion sur toute alerte, ou seulement sur les alertes
  `high` et `critical` ? (proposition : high et critical, comme SEC-006.)
- [IA] Faut-il un contrat de registre (ex. SEC-0xx, analyse statique du
  code) ? (proposition : oui, avec le contrôle CI comme preuve.)

## 6. Increments

- **Lot 1 — workflow CodeQL** [IA] : `.github/workflows/codeql.yml` (à créer)
  (JavaScript/TypeScript, sur PR et sur master, planifié chaque semaine).
  Critère de sortie : le job tourne vert sur une PR, résultats visibles
  dans l'onglet Security.
- **Lot 2 — blocage et contrat** [IA] : ajouter le contrôle au ruleset de
  master, déclarer le contrat et sa preuve. Critère de sortie : une alerte
  high introduite volontairement dans une PR d'essai bloque la fusion.

## 7. Reprise

- **Dernier état** (2026-10-14) : cadré, rien de commencé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] lot 1, après `/drwil-start` par le demandeur.
