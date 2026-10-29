# Projet : une attestation tombe quand ce qu'elle juge change, pas quand la forme d'un contrôle change

**Statut** : cadré le 2026-10-26 ; §5 tranché le même jour (plan d'action du backlog).
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/cloture-et-attestations.md` (parties « déclarer ce que couvrent les contrats attestés » et « une attestation ne doit pas tomber quand un contrôle change de forme sans changer d'effet »)

<!-- scope
files:
  - packages/drwil/src/attest.ts
  - packages/drwil/src/verify.ts
  - packages/drwil/src/verdict.ts
  - packages/drwil/src/evidence.ts
  - packages/drwil/src/coverage.ts
  - packages/drwil/src/doctor-texts.ts
  - packages/drwil/src/fingerprint.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/cloture-et-attestations.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Une attestation humaine (`drwil attest`) dit « j'ai jugé ce contrat, tel qu'il
est écrit, avec la preuve qui le porte ». Elle est liée par une empreinte au
texte du contrat, à la **définition** de sa preuve et, depuis la version 3, au
contenu des fichiers que le contrat déclare couvrir (`**Couvre**`). Deux
défauts, vécus :

1. **Elle tombe pour rien.** L'empreinte porte sur la déclaration complète des
   contrôles de `.drwil/ia-first.json`. Le 2026-10-24, l'ajout de champs de
   compilation et de parallélisme (`build`, `needsBuild`) à une centaine de
   contrôles a périmé six attestations (QUA-013, QUA-015, QUA-064, QUA-066,
   QUA-067, QUA-092) alors que l'effet des contrôles n'avait pas changé :
   l'humain a dû tout réattester.
2. **Elle ne tombe pas quand elle devrait.** 15 contrats attestés sur 17 ne
   déclarent aucun `**Couvre**` (`drwil doctor` : « Couverture des
   attestations 2/17 »). Le code qu'ils jugent peut changer sans que
   l'attestation tombe : le workflow de CI de QUA-013 a changé ainsi.

Les deux défauts se règlent ensemble : changer l'empreinte et déclarer
`**Couvre**` périment chacun toutes les attestations ; les faire dans un seul
chantier ne coûte à l'humain qu'**une** séance de réattestation.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; IDs à
attribuer à ce moment-là dans le registre.)

- L'empreinte d'une attestation porte sur l'effet des contrôles que le contrat
  cite (commande, tests visés, `paths`) et plus sur les champs d'exécution
  (`build`, `needsBuild`, `parallel`, `reuse`) : ajouter ou retirer un champ
  d'exécution ne fait pas tomber l'attestation — `QUA-183`
- Une attestation tombe quand l'effet d'un contrôle change (commande, test visé
  ou `paths`), comme avant : QUA-013 (un contrôle non exécuté n'est pas passé)
  reste vrai — `QUA-184`
- Chaque contrat attesté du dépôt déclare ce qu'il couvre (`**Couvre**`) ;
  `drwil doctor` ne signale plus aucun contrat attesté sans couverture déclarée — contrat à créer
- Les attestations tombées par le chantier sont réattestées par l'humain en une
  seule séance, et `drwil verify --evidence` rend `GOVERNANCE: PASS` [humain]
  — contrat à créer (`Manuel`, attesté par `drwil attest`)

## Contrats modifiés

(validés par le demandeur le 2026-10-29)

- `QUA-032` (une attestation ne coûte que le jugement demandé) — ancien
  critère : l'attestation (version 3) lie chaque contrôle attesté à sa
  définition (commande et dossier), et les versions 1 et 2 restent lues —
  nouveau critère : version 4, liée à l'effet du contrôle (commande, dossier,
  `paths`), les versions 1, 2 et 3 restent lues — raison : ne plus tomber quand
  seule la forme d'exécution d'un contrôle change ; rien n'est retiré.
- `QUA-082` (contrat attestable sans couverture signalé) — ancien critère :
  « la première réattestation passe à la version 3 » — nouveau : version 4 —
  raison : conséquence de la version 4 ; le signalement et la lecture des
  anciennes versions ne changent pas.
- `QUA-013` (un contrôle non exécuté n'est pas passé) — précisé, pas affaibli :
  une attestation dont un contrôle cité change d'effet tombe toujours (QUA-184).

## 2. Hors périmètre

- Reprendre le verdict d'un contrôle (QUA-140, QUA-141, QUA-152) : déjà fait.
- Changer qui peut attester : l'attestation reste un geste humain en terminal.
- Réattester : c'est la séance finale du chantier, jamais un agent.

## 3. Contraintes

- QUA-013 (un contrôle non exécuté n'est pas un succès) : une empreinte sur
  l'effet ne doit jamais laisser vivre une attestation dont le contrôle change
  vraiment (commande, tests, `paths`).
- Les attestations de version 2 (sans couverture) et de version 3 (avec) doivent
  rester lisibles ; l'outil dit laquelle est périmée et pourquoi.
- Un seul chantier, une seule séance de réattestation (décision 3).

## 4. Décisions

(validées par le demandeur le 2026-10-26)

1. L'empreinte porte sur la commande, les tests visés et les `paths` de chaque
   contrôle cité, sans les champs d'exécution (`build`, `needsBuild`,
   `parallel`, `reuse`).
2. Les deux parties (empreinte et `Couvre`) font un seul chantier et une seule
   séance de réattestation.
3. Les chemins `Couvre` sont proposés par l'agent dans cette fiche (§5) ; le
   demandeur les valide avant le lancement.
4. Tableau des 11 contrats à fichiers validé, sauf QUA-013, QUA-015 et QUA-041
   dont les listes sont **réduites** (un fichier lu souvent ne doit pas faire
   tomber l'attestation).
5. Les contrats qui jugent une conduite ou un essai (SEC-001, QUA-019, QUA-069,
   QUA-150) reçoivent aussi des chemins : aucun contrat attesté sans `Couvre`.
6. (2026-10-26, plan d'action) §5 tranché : QUA-019 et QUA-069 validés tels que
   proposés ; **SEC-001** déclare `**Couvre** : aucun`, avec sa raison (contrat
   de conduite ; `package.json` le ferait tomber à chaque release) ; **QUA-150**
   est réduit aux tests conservés avec justification (`.githooks/engine.test.mjs`,
   `outils/banc.test.mjs`, `outils/banc-agents.test.mjs`). Un `Couvre` « aucun »
   justifié compte comme déclaré pour `drwil doctor`.
7. (2026-10-26, plan d'action) Ordre : ce chantier passe après
   `docs/projects/journal.md`. QUA-048, QUA-067 et QUA-069
   couvrent `.githooks/state.mjs` et `.githooks/state-cli.mjs`, que modifient
   `cycle-de-vie-des-fiches`, `retour-scoping-branche-sondage` et la réouverture : déclarés
   avant, leurs attestations tomberaient à chacun de ces chantiers.

## 5. Points à trancher

Proposition de l'agent des chemins `**Couvre**`, relevée dans le **Périmètre**
et le **Manuel** de chaque contrat le 2026-10-26 — **à valider ou corriger** :

| Contrat | Ce qu'il juge | `Couvre` proposé |
|---|---|---|
| QUA-013 | Contrôle non exécuté n'est pas passé | `.github/workflows/ia-first.yml`, `packages/drwil/src/verdict.ts` (liste réduite) |
| QUA-015 | Fiches lisibles à froid | `.githooks/briefs.mjs` (liste réduite) |
| QUA-018 | Dépôt vs livrable | `outils/miroirs.json` |
| QUA-041 | Documentation d'entrée juste | `README.md`, `packages/drwil/README.md` (liste réduite) |
| QUA-048 | Clôture en un geste | `.githooks/close.mjs`, `.githooks/close-branches.mjs`, `.githooks/state.mjs` |
| QUA-060 | Le banc prouve un outil | `outils/banc-agents.mjs` |
| QUA-063 | Matrice de compatibilité | `docs/ia-first.md` |
| QUA-064 | Copilot installe `.claude` et ses hooks | `packages/drwil/src/config.ts`, `packages/drwil/src/render.ts`, `packages/drwil/src/drift.ts`, `packages/drwil/src/essentials.ts`, `packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json` |
| QUA-066 | Gemini installe ses hooks | `packages/drwil/src/config.ts`, `packages/drwil/templates/common/tools/gemini/.gemini/settings.json` |
| QUA-067 | Hooks Gemini | `.githooks/state-cli.mjs`, `.githooks/state.mjs`, `.claude/hooks/scope-reminder.mjs` |
| QUA-151 | Push indépendant de la charge | `.githooks/run-checks.mjs`, `.githooks/pre-push` |

Contrats qui jugent une **conduite ou un essai** (le demandeur a demandé de leur
trouver quand même des chemins) — **à valider ou corriger** :

| Contrat | Ce qu'il juge | `Couvre` proposé |
|---|---|---|
| SEC-001 | Portée des droits (drwil n'a pas de backend) | aucun, avec sa raison (décision 6) ; proposé d'abord : `packages/drwil/package.json` |
| QUA-019 | Pas de contournement d'un contrôle | `.githooks/pre-commit`, `.githooks/pre-push`, `.github/workflows/ia-first.yml` |
| QUA-069 | Essai réel sous Copilot CLI | `packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json`, `.githooks/state-cli.mjs` |
| QUA-150 | Tests qui mesurent une durée | `.githooks/engine.test.mjs`, `outils/banc.test.mjs`, `outils/banc-agents.test.mjs` (décision 6 ; proposé d'abord avec aussi `packages/drwil/test/kit.test.mjs`, `.githooks/run-checks.test.mjs`, `.githooks/state.test.mjs`) |

- Tranché le 2026-10-26 (décision 6) : les deux tableaux sont validés, SEC-001
  et QUA-150 corrigés comme ci-dessus.

## 6. Increments

- **Lot 1 — empreinte sur l'effet** [IA] : calcul de l'empreinte sans les champs d'exécution, lecture des attestations existantes (versions 2 et 3), message qui dit pourquoi une attestation tombe ; tests ; contrats et contrôles `tests-qua-<id>` ; README et changelog.
- **Lot 2 — `Couvre` des 15 contrats** [IA] : champs `**Couvre**` du tableau validé, dont `aucun` justifié pour SEC-001 (lu comme déclaré par `drwil doctor`) ; `drwil doctor` ne signale plus que ce qui reste ; tests.
- **Lot 3 — réattestation** [humain] : `drwil attest <ID> --renew` pour chaque attestation tombée, en une séance ; `drwil verify --evidence` en PASS. Critère de sortie : `node .githooks/run-checks.mjs` OK.

## 7. Reprise

- **Dernier état** (2026-10-29) : lancé ; périmètre élargi (bloc scope) aux fichiers de couverture, de textes du doctor, d'empreintes et au test du cycle (assertions de version) ; lot 1 fait (version 4, QUA-183, QUA-184).
- **Travail non commité** : aucun.
- **Prochaine étape** : lot 2 (`Couvre` des contrats, `aucun` justifié lu comme déclaré, contrat de couverture à créer), puis lot 3 [humain] (contrat Manuel à créer, `drwil attest <ID> --renew`).
