# Projet : une attestation tombe quand ce qu'elle juge change, pas quand la forme d'un contrôle change

**Statut** : cadré le 2026-10-26.
**Risque** : HIGH
**Maturité** : à affiner
**Intention** : `docs/intentions/cloture-et-attestations.md` (parties « déclarer ce que couvrent les contrats attestés » et « une attestation ne doit pas tomber quand un contrôle change de forme sans changer d'effet »)

<!-- scope
files:
  - packages/drwil/src/attest.ts
  - packages/drwil/src/verify.ts
  - packages/drwil/src/verdict.ts
  - packages/drwil/src/evidence.ts
  - packages/drwil/test/kit.test.mjs
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
  d'exécution ne fait pas tomber l'attestation — contrat à créer
- Une attestation tombe quand l'effet d'un contrôle change (commande, test visé
  ou `paths`), comme avant : QUA-013 (un contrôle non exécuté n'est pas passé)
  reste vrai — contrat à créer
- Chaque contrat attesté du dépôt déclare ce qu'il couvre (`**Couvre**`) ou dit
  pourquoi il n'a rien à couvrir ; `drwil doctor` ne signale plus aucun contrat
  attesté sans couverture déclarée — contrat à créer
- Les attestations tombées par le chantier sont réattestées par l'humain en une
  seule séance, et `drwil verify --evidence` rend `GOVERNANCE: PASS` [humain]
  — contrat à créer (`Manuel`, attesté par `drwil attest`)

## Contrats modifiés

(à compléter au lancement : le contrat de l'empreinte d'attestation existant,
trouvé par `node .githooks/glossary.mjs "attestation"`, change de critère —
nouvelle empreinte —, et QUA-013 est précisé, pas affaibli. Chaque ancien
critère et sa raison sont à écrire ici et à valider par le demandeur avant le
lancement.)

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

## 5. Points à trancher

Proposition de l'agent des chemins `**Couvre**`, relevée dans le **Périmètre**
et le **Manuel** de chaque contrat le 2026-10-26 — **à valider ou corriger** :

| Contrat | Ce qu'il juge | `Couvre` proposé |
|---|---|---|
| QUA-013 | Contrôle non exécuté n'est pas passé | `.github/workflows/ia-first.yml`, `packages/drwil/src/verify.ts`, `packages/drwil/src/verdict.ts`, `.githooks/run-checks.mjs` |
| QUA-015 | Fiches lisibles à froid | `docs/projects/model-brief.md`, `.githooks/briefs.mjs` |
| QUA-018 | Dépôt vs livrable | `outils/miroirs.json` |
| QUA-041 | Documentation d'entrée juste | `README.md`, `INSTALL.md`, `docs/architecture.md`, `packages/drwil/README.md` |
| QUA-048 | Clôture en un geste | `.githooks/close.mjs`, `.githooks/close-branches.mjs`, `.githooks/state.mjs` |
| QUA-060 | Le banc prouve un outil | `outils/banc-agents.mjs` |
| QUA-063 | Matrice de compatibilité | `docs/ia-first.md` |
| QUA-064 | Copilot installe `.claude` et ses hooks | `packages/drwil/src/config.ts`, `packages/drwil/src/render.ts`, `packages/drwil/src/drift.ts`, `packages/drwil/src/essentials.ts`, `packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json` |
| QUA-066 | Gemini installe ses hooks | `packages/drwil/src/config.ts`, `packages/drwil/templates/common/tools/gemini/.gemini/settings.json` |
| QUA-067 | Hooks Gemini | `.githooks/state-cli.mjs`, `.githooks/state.mjs`, `.claude/hooks/scope-reminder.mjs` |
| QUA-151 | Push indépendant de la charge | `.githooks/run-checks.mjs`, `.githooks/pre-push` |

- [décision] Contrats qui jugent une **conduite ou un essai** et non des
  fichiers : SEC-001 (pas de backend), QUA-019 (pas de contournement), QUA-069
  (essai réel sous Copilot CLI), QUA-150 (recensement des tests de durée, jugé
  à un instant donné). Proposition : leur attestation ne porte sur aucun
  chemin ; ils le disent (champ ou ligne explicite) et `drwil doctor` ne les
  signale plus. Validé ?
- [décision] Chemins larges (QUA-013, QUA-015, QUA-041) : tomber à chaque
  modification d'un fichier lu souvent coûte une réattestation. Proposition :
  garder les chemins du tableau, quitte à réattester ; sinon réduire la liste.
  Validé ?
- [décision] Le tableau ci-dessus est-il juste, contrat par contrat ?

## 6. Increments

- **Lot 1 — empreinte sur l'effet** [IA] : calcul de l'empreinte sans les champs d'exécution, lecture des attestations existantes (versions 2 et 3), message qui dit pourquoi une attestation tombe ; tests ; contrats et contrôles `tests-qua-<id>` ; README et changelog.
- **Lot 2 — `Couvre` des 15 contrats** [IA] : champs `**Couvre**` du tableau validé ; `drwil doctor` ne signale plus que ce qui reste ; tests.
- **Lot 3 — réattestation** [humain] : `drwil attest <ID> --renew` pour chaque attestation tombée, en une séance ; `drwil verify --evidence` en PASS. Critère de sortie : `node .githooks/run-checks.mjs` OK.

## 7. Reprise

- **Dernier état** (2026-10-26) : cadré, tableau `Couvre` à valider (§5).
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] valider le §5, puis lancer le chantier (`/drwil-start`).
