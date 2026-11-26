# Intention : la CI GitLab reprend la preuve de la branche fusionnée

**Statut** : proposée le 2026-11-26 — à trancher après la mesure outillée par `docs/projects/preuve-gitlab-non-reprise.md`.

## Besoin

Sur un projet adoptant, la branche principale a tout rejoué alors que le pipeline de la branche avait prouvé le même
arbre. La reprise attendue (QUA-296, et QUA-250 pour les verdicts de la branche principale) doit marcher en réel, ou
sa limite être documentée.

## Existant

Cause non établie ; faits et piste (jeton du job refusé selon l'offre GitLab) : voir la fiche citée. Les tests jouent
un `curl` factice. La fiche citée affiche la raison, sans corriger.

## Questions à trancher

- [humain] Sur un vrai pipeline : quel statut HTTP, avec quelle offre GitLab ? En cas d'échec, que donne le même
  appel avec un jeton d'accès autorisé ?
- [décision] Le correctif, après cette mesure : sans secret à créer, jeton facultatif chez l'adoptant, ou limite
  documentée. La preuve finale est un pipeline réel qui la reprend, attesté par un humain.
