# Intention : une attestation sans friction inutile

**Statut** : proposée le 2026-10-16 — retour d'expérience du chantier
« lien contrat ↔ test » (`docs/projects/journal.md`).

**Projet** : DRWIL — livrable d'abord (`drwil attest`, `drwil verify`), le
dépôt suit.

## Besoin

L'attestation est le seul geste humain obligatoire de la clôture : il doit
coûter le jugement demandé, rien de plus. Deux frictions relevées le
2026-10-16 :

1. **Réattester une preuve renforcée** : ajouter un contrôle au champ
   Contrôle d'un contrat rend son attestation obsolète, alors que la part
   humaine (champ Manuel) n'a pas changé et que la preuve automatique est
   plus forte.
2. **Un `attest` muet** : avant de demander la confirmation, `drwil attest`
   relance tous les contrôles cités par le contrat sans rien afficher ;
   pour QUA-013 (un contrôle non exécuté n'est pas passé), plus de deux
   minutes de terminal silencieux, pris pour un blocage.

## Existant (vérifié le 2026-10-16)

- L'empreinte d'une attestation (`fingerprint`, `packages/drwil/src/verify.ts`)
  couvre tout le texte de la section du contrat et la définition (commande,
  dossier) des contrôles qu'il cite : tout changement, même un ajout,
  l'invalide.
- `packages/drwil/src/attest.ts` appelle `verify({ only: [id] })`, dont les
  contrôles tournent en sortie capturée (`stdio: "pipe"`), puis seulement
  affiche le résumé et pose la question.
- Cas réel : le chantier « lien contrat ↔ test » a ajouté un contrôle à
  QUA-013 et QUA-015 (chantiers exploitables à froid) ; le demandeur a dû
  réattester les deux pour clore.

## Questions à trancher

- [décision] Point 1 : l'empreinte ne couvre plus que la règle, le champ
  Manuel et les contrôles déjà attestés (un contrôle ajouté ne l'invalide
  pas, un contrôle retiré ou modifié si), ou garder la réattestation
  systématique, plus simple et plus prudente ?
- [décision] Point 2 : annoncer chaque contrôle relancé (« couverture-tests…
  ok »), ou seulement une ligne « relance des contrôles cités, peut prendre
  plusieurs minutes » ?
- [décision] Priorité dans l'index.

## Liens

- `docs/contracts.md` : QUA-013 et QUA-015, les deux contrats réattestés.
- `docs/recipes/working-with-branches.md`, section « Closing » : la place
  de l'attestation dans la clôture.
