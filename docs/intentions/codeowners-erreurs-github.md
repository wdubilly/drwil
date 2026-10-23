# Intention : lire les erreurs que GitHub relève dans CODEOWNERS

**Statut** : proposée le 2026-10-24 — limite du chantier « CODEOWNERS
protège le registre sous son nom actuel » (journal du 2026-10-24).

## Besoin

Le contrôle `codeowners` (QUA-112, chaque ligne de CODEOWNERS cite un
chemin suivi par Git) ne juge que les chemins. Une ligne au chemin juste
reste sans effet si son propriétaire n'existe pas ou n'a pas d'accès en
écriture, ou si GitHub lit autrement une syntaxe : la revue obligatoire
tombe alors en silence, comme avec l'ancien nom du registre.

## Existant (relevé le 2026-10-24)

- GitHub expose les erreurs qu'il relève dans le fichier
  (`gh api repos/<propriétaire>/<dépôt>/codeowners/errors`).
- Le contrôle `codeowners` tourne hors ligne, au commit et en CI, sans
  appel à la forge.

## Questions à trancher

- [décision] Interroger cette API en CI (jeton, forge joignable, échec
  réseau en erreur et non en succès, QUA-013 — contrôle non exécuté n'est
  pas passé), ou s'en tenir au contrôle hors ligne ?
