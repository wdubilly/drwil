# Projet : QUA-017 ne bloque pas un push qui ne fait que supprimer une branche distante

**Statut** : ouvert le 2026-10-09 — décisions prises le 2026-10-10, lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - .githooks/pre-push
  - .githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/pre-push
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/moteur.mjs
  - packages/drwil/templates/common/base/.githooks/moteur.mjs
  - packages/drwil/test/kit.test.mjs
-->

(cadrage repris du correctif du push de tag, même mécanique ; à confirmer
au démarrage.)

## 1. Besoin

Le 2026-10-09, depuis `master` à jour, `git push origin --delete
<branche-déjà-fusionnée>` a été refusé par le pre-push : « travail direct
sur la branche principale (master) ». Supprimer une branche distante ne
touche pas la branche principale ; c'est un faux positif de QUA-017 (pas de
travail direct sur la branche principale), cousin de celui du push de tag
pur (corrigé le 2026-10-05, voir `docs/projets/journal.md`).

Mécanique : pour une suppression, Git passe au hook pre-push une ligne dont
le SHA local ne contient que des zéros. Le hook reconnaît déjà un push qui
ne contient que des tags (`DRWIL_PUSH_TAGS_ONLY`) ; il ne reconnaît pas les
suppressions.

## 2. Hors périmètre

- Assouplir QUA-017 pour un push de branche réel depuis `master`.
- Interdire ou encadrer la suppression de branches (choix de l'humain).

## 3. Contraintes

- Par prudence, dès qu'une référence poussée n'est ni un tag ni une
  suppression, le contrôle s'applique normalement (comme pour les tags).
- Supprimer la branche principale distante elle-même reste un cas à part :
  à trancher (point 5).
- Dépôt et gabarit (QUA-018, périmètre dépôt / gabarit).

## 4. Décisions

- **2026-10-10 — Suppression de la branche principale laissée au ruleset** :
  le pre-push laisse passer toute suppression de branche distante ; la
  suppression de `master` est interdite côté GitHub par le ruleset
  (`docs/projets/proteger-master.md`). [décision utilisateur]
- **2026-10-10 — Cadrage élargi à `.githooks/moteur.mjs`** : c'est lui qui
  affiche « push de tags uniquement » ; une suppression doit être nommée
  correctement, pas confondue avec un push de tags.

## Contrats concernés

- **QUA-017** — Pas de travail direct sur la branche principale : le
  contrôle corrigé.
- **QUA-019** — Pas de contournement d'un contrôle : la suppression doit
  passer par un chemin prévu, pas par l'API GitHub pour éviter le hook.

## 5. Points à trancher

- ~~Les points ouverts~~ — tranchés le 2026-10-10 (voir « Décisions »).

## 6. Lots

- **Lot 1 — suppressions reconnues par le pre-push** [IA] : un push qui ne
  contient que des tags et/ou des suppressions de branches ne déclenche
  pas QUA-017. Critère de sortie : un test du kit reproduit le cas du
  2026-10-09 (depuis `master`, suppression d'une branche distante
  acceptée), et un push mixte suppression + branche reste contrôlé.

## 7. Reprise

- **Dernier état** (2026-10-09) : fiche ouverte, rien de réalisé. La
  branche distante `chantier/gouvernance-attente-active` (déjà fusionnée)
  reste à supprimer par l'humain, depuis GitHub.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] trancher le point 5.
