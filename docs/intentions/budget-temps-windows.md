# Intention : un budget de temps des contrôles calibré pour les machines Windows de la CI

**Statut** : proposée le 2026-10-17 — relevé pendant le chantier « un
identifiant cité sans libellé est complété sous la réponse de l'agent »
(journal du 2026-10-17), PR #138.

## Besoin

Le test « budget de temps : les contrôles au commit d'un projet équipé
restent rapides » (`packages/drwil/test/kit.test.mjs`) exige au plus
1500 ms. Le 2026-10-17, un job Windows de la CI l'a dépassé (1897 ms) sans
changement qui l'explique : relancé tel quel, il est passé (1009 ms).
Rouge passager, il arrête une file de chantiers et demande une relance à
la main.

## Existant (vérifié le 2026-10-17)

Mesures `[budget-commit]` lues dans les journaux de CI :

- PR #137 (avant le chantier) : Linux 258 et 284 ms, macOS 405 et 580 ms,
  Windows 644 et 973 ms.
- PR #138 : Linux 262 et 270 ms, macOS 344 et 350 ms, Windows 1113, 1897
  puis 1009 ms (relance).
- Le glossaire ajouté par ce chantier coûte 2 à 6 ms dans un projet
  équipé (mesuré en local) : il n'explique pas l'écart.
- Commentaire du test : « Marge large pour le bruit des machines de CI
  partagées ; ne se relève que sur décision (cliquet). »

## Questions à trancher

- [décision] Un budget par système (Windows plus large), une médiane de
  plusieurs mesures, ou un budget inchangé avec relance automatique du
  test en cas de dépassement ?
- [décision] Le relever reste-t-il une décision humaine (cliquet), comme
  le dit le test ?
