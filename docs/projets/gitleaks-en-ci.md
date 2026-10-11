# Projet : gitleaks en CI — secrets prouvés, tarball vert

**Statut** : cadré le 2026-10-11 — lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - .github/workflows/ia-first.yml
  - outils/miroirs.json
-->

(cadrage : ce dépôt seulement — QUA-018 (périmètre explicite : dépôt drwil
vs livrable gabarit) : la CI du gabarit ne change pas. HIGH imposé :
`.github/`.)

## 1. Besoin

Relevé le 2026-10-11 sur la PR #50 (contrôle `tarball`, chantier « tester
la CLI installée depuis le tarball ») : en CI, le job `checks` n'a pas
gitleaks. Deux conséquences :

- le contrôle `secrets-fichiers` du dépôt y est « non exécuté » : SEC-007
  (pas de secret dans le dépôt) n'est jamais prouvé en CI, seulement au
  commit chez qui a gitleaks ;
- dans le projet d'essai du contrôle `tarball`, `drwil verify` rend ERROR
  sur SEC-007 : le contrôle échoue en CI alors qu'il passe en local (où
  gitleaks est installé). Le paquet n'est pas en cause.

## 2. Hors périmètre

- La CI livrée par le gabarit (`drwil init --ci github`).
- Assouplir le contrôle `tarball` (option écartée par l'utilisateur).

## 3. Contraintes

- Version de gitleaks épinglée (celle utilisée en local : 8.21.2), archive
  vérifiée par sa somme de contrôle publiée avant d'être exécutée.
- Installation impossible : le job échoue, jamais un contrôle sauté
  (QUA-019, pas de contournement).

## 4. Décisions

- **2026-10-11 — Installer gitleaks dans le job `checks`** plutôt que
  tolérer un « non exécuté » dans le contrôle `tarball`. [décision
  utilisateur]

## Contrats concernés

- **SEC-007** — Pas de secret dans le dépôt : prouvé en CI sur tout
  l'historique.
- **QUA-013** — Contrôle non exécuté n'est pas passé.
- **QUA-019** — Pas de contournement d'un contrôle.

## 5. Points à trancher

(aucun)

## 6. Lots

- **Lot 1 — gitleaks dans le job `checks`** [IA] : étape d'installation
  épinglée et vérifiée avant `.githooks/run-checks.mjs` ; écart du fichier de CI
  mis à jour dans `outils/miroirs.json`. Critère de sortie : sur la PR,
  `secrets-fichiers` exécuté (plus « non exécuté ») et `tarball` vert ;
  job `checks` vert.

## 7. Reprise

- **Dernier état** (2026-10-11) : fiche cadrée, rien de réalisé ; la
  PR #50 reste rouge, fusion automatique programmée en attente.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] `/drwil-lancer`.
