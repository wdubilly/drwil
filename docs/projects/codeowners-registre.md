# Projet : CODEOWNERS protège le registre sous son nom actuel

**Statut** : cadré le 2026-10-23.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/codeowners-registre.md`

<!-- scope
files:
  - .github/CODEOWNERS
  - outils/verifier-codeowners.mjs
  - outils/verifier-codeowners.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
-->

## 1. Besoin

`.github/CODEOWNERS` protège /docs/contrats.md, l'ancien nom du
registre. Le registre s'appelle aujourd'hui `docs/contracts.md` : une
modification des contrats, donc des règles, n'exige pas la relecture du
propriétaire, alors que le ruleset l'impose (`require_code_owner_review`)
pour les autres zones sensibles. Rien n'a signalé l'écart au renommage, et
rien ne le signalerait au prochain.

Propre au dépôt : `CODEOWNERS` n'est pas dans le livrable (QUA-018,
dépôt drwil ou livrable gabarit).

## Critères d'acceptation

(le contrat est à créer au lancement, avec son champ **Origine** ; ID à
attribuer à ce moment-là dans le registre.)

- `.github/CODEOWNERS` cite le registre sous son nom actuel, et un
  contrôle du dépôt, rejoué au commit et en CI, refuse toute ligne de
  `CODEOWNERS` dont le chemin ne correspond à aucun fichier ni dossier
  suivi par Git — `QUA-112`

## 2. Hors périmètre

- Livrer un `CODEOWNERS` aux projets adoptés
  (`docs/intentions/forge-dans-le-livrable.md`).
- Changer la liste des zones sensibles ou le ruleset.

## 3. Contraintes

- Contrôle dans `outils/`, comme les autres contrôles propres au dépôt,
  déclaré dans `.drwil/ia-first.json` avec ses `paths`.
- Lecture des motifs selon la syntaxe GitHub (chemin ancré par `/`,
  dossier terminé par `/`, motifs `*`) ; un motif qu'il ne sait pas
  interpréter est une erreur, jamais un succès (QUA-013, un contrôle non
  exécuté n'est pas passé).
- Change les règles du jeu (CODEOWNERS, nouveau contrôle) : validé par le
  demandeur au cadrage, le 2026-10-23.

## 4. Décisions

- 2026-10-23 — Corriger le chemin et ajouter un contrôle propre au dépôt
  (demandeur).
- 2026-10-24 — Cadrage élargi à `docs/architecture.md` : la carte doit
  citer le nouvel outil (QUA-040, carte d'architecture à jour) (agent).

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — chemin et contrôle** [IA] : ligne corrigée ; contrôle
  outils/verifier-codeowners.mjs et ses tests (chemin absent refusé,
  dossier et fichier présents acceptés, motif inconnu en erreur) ; contrat
  au registre, contrôle `tests-qua-<id>` déclaré. Critère de sortie :
  `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-23) : cadré.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
