# Intention : des tests de timing qui échouent sous la charge du hook de pré-push

**Statut** : ouverte le 2026-10-26 — limite constatée en poussant la branche `cadrage/file-en-parallele` : sur 5 pushs, 4 ont été refusés par un test de timing, alors que les mêmes tests passent hors hook.

## Besoin

Le hook de pré-push lance les contrôles en parallèle ; la machine est alors chargée et des tests qui mesurent une durée ou un classement de durées échouent sans qu'aucun code ne soit en cause. Chaque refus coûte une passe complète (environ 3 minutes) et pousse à relancer à l'aveugle, ce qu'il ne faut pas faire pour un vrai défaut. Le besoin : un push qui ne dépend pas de la charge de la machine, sans désactiver ni contourner de contrôle (QUA-019, pas de contournement).

## Existant (relevé le 2026-10-26)

- `packages/drwil/test/kit.test.mjs:311` : « budget de temps : les contrôles au commit d'un projet équipé restent rapides ». Assertion bloquante `ms <= 1500` ; mesuré 107 à 369 ms au repos, 2237 ms puis 1534 ms sous le hook. Le test écrit déjà la mesure (`[budget-commit]`) et dit que le budget « ne se relève que sur décision (cliquet) ».
- `.githooks/run-checks.test.mjs:452` : QUA-136 (durée de chaque contrôle au détail, trois plus lents au résumé). Attend que `pas-si-rapide` figure parmi les trois plus lents ; échoué quand le contrôle `secrets (gitleaks)` (206 ms) s'est intercalé.
- Hors hook, la suite du paquet passe : 218 tests sur 218, couverture 95 % lignes.

## Questions à trancher

Tranchées le 2026-10-26 et cadrées dans `docs/projects/tests-de-timing-stables.md` : budget en indicateur (avertissement compté), QUA-136 par contrôles factices à durée imposée, recensement dans le même chantier, tests du dépôt seulement (QUA-018). Texte d'origine :

- [décision] Le test de budget doit-il rester bloquant (mais robuste : médiane de plusieurs mesures, ou budget relevé) ou devenir un indicateur (avertissement compté) ? Le relever ou le passer en avertissement change un seuil : décision du demandeur.
- [décision] Le test de QUA-136 doit-il rendre les durées simulées déterministes (contrôles factices dont la durée est imposée, pas mesurée) plutôt que dépendre de contrôles réels ?
- [décision] Un recensement des autres tests qui mesurent une durée : à faire dans le même chantier ou non ?
- Le chantier touche le gabarit (`packages/drwil/templates/`) ou seulement des tests du dépôt : à établir au cadrage (QUA-018, dépôt ou livrable).
