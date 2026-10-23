# Intention : gitleaks dans le job de passage du mini-banc

**Statut** (2026-10-23) : tranchée — gitleaks installé dans le job de passage,
cadré dans `docs/projects/banc-pret-essai.md`. Limite du chantier « Mini-banc :
déroulé conservé et copie réaliste » (journal du 2026-10-23).

**Projet** : DRWIL — **Niveau de risque** : HIGH (le changement touche
`.github/workflows/banc.yml`, où tourne l'agent avec le jeton d'abonnement).

## Besoin

Dans la condition « avec », la copie du banc a désormais un dépôt distant
local où pousser (QUA-108). Mais le job `passage` de
`.github/workflows/banc.yml` n'installe pas gitleaks : le contrôle des secrets
y est « non exécuté », ce qui laisse commiter mais refuse le push (QUA-013,
contrôle non exécuté n'est pas passé). L'agent sous drwil y sera bloqué au push
quoi qu'il fasse, ce qui pèse sur la mesure contre la condition « avec ».

## Existant (vérifié le 2026-10-23)

- `.github/workflows/ia-first.yml` installe gitleaks 8.21.2, archive vérifiée
  par sa somme ; `.github/workflows/banc.yml` non.
- Le README de drwil ne cite pas gitleaks dans les prérequis : un utilisateur
  sans gitleaks a le même refus au push. Le protocole réduit
  (`docs/benchmark-protocole.md`, limites) le dit.

## Questions à trancher

- Tranché le 2026-10-23 : installer gitleaks dans le job de passage, comme
  la CI principale — on mesure drwil, pas une installation incomplète.
  [décision utilisateur]
