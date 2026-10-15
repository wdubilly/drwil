# Intention : un doctor juste sur le dépôt drwil lui-même

**Statut** : proposée le 2026-10-15 — retour d'expérience du chantier
« fiabiliser le package npm » (journal du 2026-10-15).

## Besoin

Sur ce dépôt, `drwil doctor` avertit que le manifeste
`.drwil/installed-files.json` (si présent) et l'enregistrement de version
`.drwil/install.json` (si présent) manquent, et conseille de relancer
`npx drwil init`. Or ce dépôt ne s'installe pas par `init` mais depuis son
gabarit (`npm run installer-depot`) : le conseil ne s'applique pas, et deux
avertissements permanents finissent par ne plus être lus.

## Existant

Relevé le 2026-10-15 : `packages/drwil/src/doctor.ts` (points « manifeste »
et « version ») ne connaît que `init` ; `outils/installer-depot.mjs` installe
le dépôt dans une copie temporaire puis recopie les fichiers du gabarit,
sans manifeste ni enregistrement de version. L'avertissement du manifeste
existait avant le chantier ; celui de la version est nouveau.

## Questions à trancher

- [décision] `installer-depot` doit-il écrire le manifeste et
  l'enregistrement de version, comme `init` ?
- [décision] Ou `doctor` doit-il reconnaître le dépôt drwil (réglage dans
  `.drwil/ia-first.json`) et adapter son conseil ?
