# Intention : les tests qui laissent des fichiers dans leur dossier temporaire se corrigent à la source

**Statut** : proposée le 2026-10-25 — limite constatée à la clôture du chantier
« les contrôles ne laissent plus de dossiers temporaires ».

## Besoin

Depuis QUA-133 (une racine temporaire par passe, supprimée à la fin), aucun
reste ne s'accumule dans `/tmp`, mais les tests continuent de laisser des
fichiers et dossiers dans leur dossier temporaire : QUA-134 (un contrôle qui
laisse des fichiers temporaires est nommé et compté comme avertissement) les
nomme à chaque passe. Ils masquent les vrais avertissements : le résumé de
`run-checks` est passé de 1 à 31 avertissements le 2026-10-25.

## Existant (relevé le 2026-10-25)

- 31 contrôles nommés par `node .githooks/run-checks.mjs`, dont « tests des
  contrôles eux-mêmes » (84 éléments), « hooks de gouvernance : tests +
  couverture » (85) et « drwil: build + tests + seuil de couverture » (27) ;
  la liste complète est dans `.drwil/evidence/run-checks.log` (si présent)
  (lignes « laisse N élément(s) »).
- Écartés au cadrage : un utilitaire unique de dossier temporaire de test et une
  règle refusant `mkdtempSync` direct (une quarantaine de fichiers à migrer) ;
  faire échouer la passe sur une fuite (tous les commits seraient bloqués tant
  que les fuites ne sont pas corrigées).

## Questions à trancher

- [décision] Corriger les fuites une à une (entretien courant), ou reprendre
  l'utilitaire unique et la règle, maintenant que la liste est connue ?
- [décision] Faire échouer la passe sur une fuite une fois la liste vidée ?
