# Intention : les tests laissent des dossiers /tmp/drwil-* jamais supprimés

**Statut** : proposée le 2026-10-24 — limite constatée pendant la clôture du
chantier « réduire le contexte relu par chantier » ; cadrée le 2026-10-24 dans
`docs/projects/dossiers-temporaires-des-tests.md` (les deux questions sont
tranchées : racine par passe et comptage, une racine par passe).

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

## Historique : troisième occurrence (complété le 2026-10-24)

- 2026-10-05, journal « Garder le commit rapide sans perdre de contrôle » :
  7 919 restes des tests du kit avaient épuisé les inodes de `/tmp` ;
  correction : suppression après chaque test (gardés si le test échoue).
- 2026-10-09, journal « Les tests des hooks nettoient leurs dossiers
  temporaires » : 40 061 dossiers, inodes épuisés ; correction : `afterEach`
  dans `.githooks/state.test.mjs` et `.githooks/scope-gate.test.mjs`.
- 2026-10-24 : 13 500 dossiers, `verify` en FAIL `ENOSPC` (ci-dessus).

Les deux corrections étaient faites fichier par fichier, sans garde-fou :
les tests écrits depuis fuient à nouveau (92 dossiers par `verify`).

## Besoin réel : l'anti-récidive (décision de l'humain du 2026-10-24)

Corriger les fuites actuelles ne suffit pas : il faut empêcher qu'un nouveau
test en recrée. Pistes :

1. un contrôle qui compte les `drwil-*` du dossier temporaire avant et après
   une passe des tests, et échoue si leur nombre augmente ;
2. un utilitaire unique de dossier temporaire de test (créé, puis supprimé
   après un test réussi, gardé et affiché en cas d'échec) et une règle qui
   refuse un `mkdtempSync` direct dans un fichier de test.

## Questions à trancher

- Piste 1, piste 2 ou les deux ?
- Un dossier racine par passe, supprimé à la fin, ou un dossier par test ?
