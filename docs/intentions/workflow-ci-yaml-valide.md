# Intention : un workflow CI au YAML invalide est refusé avant le push

**Statut** : proposée le 2026-10-18 — limite du chantier « Windows et
macOS testés seulement quand une PR touche du code » (journal du
2026-10-18, 0.6.4).

## Besoin

Pendant ce chantier, un `run:` non cité contenant « : » a rendu
`.github/workflows/ia-first.yml` invalide : GitHub a rejeté tout le
workflow (« workflow file issue », aucun job lancé), alors que les
contrôles locaux et le test du workflow étaient verts. L'erreur ne s'est
vue qu'après le push.

## Existant (vérifié le 2026-10-18)

- `.github/scripts/ci-multi-os.test.mjs` (QUA-045) lit le workflow comme
  du texte (`readFileSync` et expressions régulières), sans le parser :
  une erreur de syntaxe YAML lui échappe.
- Aucune bibliothèque YAML dans les dépendances du dépôt ; Node n'en a
  pas en natif.
- actionlint 1.7.7 (binaire téléchargé à la main) a détecté l'erreur et
  passe sur le workflow corrigé.
- Un contrôle placé dans le workflow lui-même ne s'exécute pas quand ce
  workflow est invalide : seule une vérification locale (hook, test)
  attrape l'erreur avant le push.

## Questions à trancher

- [décision] Parser les workflows dans un test (dépendance de dev YAML,
  `package.json` et lockfile touchés) ou lancer actionlint au commit
  (binaire épinglé et vérifié par sha256, comme gitleaks) ?
- [décision] Tous les workflows du dépôt, ou aussi celui livré dans le
  gabarit (QUA-018, dépôt ou livrable) ?
