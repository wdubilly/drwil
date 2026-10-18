# Intention : compter `package.json` parmi les seuils d'un détour

**Statut** : proposée le 2026-10-18 — limite du chantier « un détour pour
une correction intercalée » (journal du 2026-10-18, 0.6.5, 4 sur 4).

## Besoin

Un détour qui change un seuil demande le oui de l'humain (QUA-050, un
détour pour une correction intercalée). Les seuils reconnus sont ceux de
`.drwil/ia-first.json` ; or un seuil peut vivre ailleurs : dans ce dépôt,
le seuil de couverture des hooks à 100 % (QUA-004, seuil de couverture de
test) est écrit dans un script de `package.json`. Un détour qui le
baisserait passerait sans oui.

## Existant (vérifié le 2026-10-18)

- `.githooks/detour.mjs` (`RULES`) : `.githooks/*`, `.drwil/ia-first.json`,
  `.github/workflows/*`, le fichier de CI GitLab, plus le registre et les
  `ciFiles` réglés ; `package.json` n'y est pas.
- `package.json` : script `test:hooks:coverage`, `c8 --check-coverage
  --lines 100 --branches 100 --functions 100 --statements 100`.
- Un projet installé peut aussi porter ses seuils dans `package.json`, un
  fichier de configuration d'outil (`.c8rc`, `vitest.config.*`…) ou sa CI.

## Questions à trancher

- [décision] Ajouter `package.json` entier aux règles du jeu (simple, mais
  tout changement de dépendance demanderait le oui), ne regarder que ses
  scripts, ou laisser chaque projet déclarer ses fichiers de seuils dans
  `.drwil/ia-first.json` (comme `ciFiles`) ?
