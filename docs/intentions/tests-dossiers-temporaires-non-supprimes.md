# Intention : les tests laissent des dossiers /tmp/drwil-* jamais supprimés

**Statut** : proposée le 2026-10-24 — limite constatée pendant la clôture du
chantier « réduire le contexte relu par chantier ».

## Besoin

Les tests créent des dossiers `drwil-*` dans le dossier temporaire du système
sans les supprimer. Le 2026-10-24, 13 500 dossiers ont épuisé les inodes du
tmpfs `/tmp` (WSL) : `drwil verify` est tombé (33 FAIL `ENOSPC`), sans défaut
du code vérifié. Une passe de `drwil verify --evidence` en laisse 92 de plus,
et chaque commit (hook `run-checks`) en laisse aussi (26 constatés).

## Existant (relevé le 2026-10-24)

- Avant / après une passe de `verify --evidence` : 0 → 92, puis 118 → 210
  (`ls -d /tmp/drwil-* | wc -l`) ; inodes de `/tmp` 6 % → 8 %.
- Même famille de défaut, à la racine du dépôt : note du 2026-10-22 sur les
  dossiers vides `drwil-banc-*` laissés par le test QUA-060 (un outil n'est tenu que prouvé
  par le banc) dans `outils/banc-agents.test.mjs`.

## Questions à trancher

- Supprimer chaque dossier temporaire en fin de test (`after`/`t.after`), ou
  un dossier racine par passe supprimé à la fin ?
- Un contrôle qui compte les `drwil-*` restants après la suite, pour que le
  défaut ne revienne pas ?
