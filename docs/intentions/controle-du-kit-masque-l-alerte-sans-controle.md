# Intention : le contrôle `taille-kit` déclaré à l'installation ne doit pas masquer l'alerte « aucun contrôle du projet déclaré »

**Statut** : proposée le 2026-10-28 — limite relevée à la clôture de `surveillance-taille-du-kit`.

## Besoin

`drwil init` déclare le contrôle `taille-kit` dans `.drwil/ia-first.json` →
`checks` (QUA-157). Un projet neuf a donc un contrôle déclaré dès
l'installation, alors qu'il n'a encore aucun contrôle à lui. Or
`.githooks/run-checks.mjs` n'alerte « aucun contrôle du projet déclaré » que
si `checks` est vide : le contrôle du kit masque cette alerte, y compris en
CI, où elle fait échouer le passage. Un projet neuf sans test passe alors
au vert sans que rien ne dise qu'il ne contrôle rien de son code.

## Existant (relevé le 2026-10-28)

- `.githooks/run-checks.mjs` : `if (!Array.isArray(cfg.checks) || !cfg.checks.length) unrun(...)`.
- `packages/drwil/src/config-write.ts` (`withKitSize`) ajoute `taille-kit` aux
  `checks` du projet à chaque installation.
- Le chantier `surveillance-taille-du-kit` ne pouvait pas toucher
  `.githooks/run-checks.mjs` (hors cadrage, et la règle change : décision humaine).

## Questions à trancher

- [décision] Faire ignorer par `run-checks` les contrôles déclarés par le kit
  (marque `kit: true` dans l'entrée, ou liste d'identifiants du kit) pour
  l'alerte « aucun contrôle du projet », ou déclarer les contrôles du kit
  ailleurs que dans `checks` ?
- Même chantier : un projet neuf reçoit à chaque passe l'avertissement
  « docs/ia-first.md : 916 lignes, plafond 800 », car `kitSizeLegacy` n'est
  posé que dans ce dépôt ; le semer à l'installation figerait une taille qui
  vieillit (à traiter avec la réduction de `docs/ia-first.md`,
  `docs/intentions/fichiers-charges-courts.md`).
