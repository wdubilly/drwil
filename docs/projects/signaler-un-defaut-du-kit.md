# Projet : signaler un défaut du kit

**Statut** : cadré le 2026-10-30.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/bin/drwil.js
  - packages/drwil/src/cli-report.ts
  - packages/drwil/src/cli-texts.ts
  - packages/drwil/src/index.ts
  - packages/drwil/test/report.test.mjs
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - packages/drwil/templates/common/base/docs/recipes/report-a-kit-defect.md
  - docs/recipes/report-a-kit-defect.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/projects/kit-mechanics.md
  - docs/architecture.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Depuis un projet qui a installé drwil, aucun chemin n'est prévu pour remonter un défaut du kit vers le dépôt
drwil : l'agent de `drwil_walk` a proposé « le noter dans wdubilly/drwil » sans moyen outillé, et la
rédaction dépend de la session.

## Critères d'acceptation

- Une commande `drwil` imprime un rapport de défaut prêt à coller : version du kit, contrôle en échec et son
  message — `QUA-231`
- Le rapport ne contient aucune donnée du projet (chemins absolus, noms de dépôt, contenu de fichiers,
  secrets) — `QUA-232`
- La commande n'écrit jamais dans un autre dépôt et n'appelle aucune forge — `QUA-233`
- Le texte du rapport est lisible et assez précis pour être reproduit — [humain] — `QUA-234`

## 2. Hors périmètre

- Ouvrir l'issue automatiquement via `gh` (option écartée : le texte à coller suffit).
- Un canal de retour de la consommation ou de la télémétrie.

## 3. Contraintes

- Livrable : la commande et la recette vont dans le gabarit (`packages/drwil/`), jamais dans une copie.
- QUA-013 : un contrôle non exécuté n'est pas passé ; le rapport dit ce qui n'a pas pu être lu.
- Doc visiteur en anglais pour `packages/drwil/README.md` et `packages/drwil/CHANGELOG.md`.

## 4. Décisions

Tranchées par le demandeur le 2026-10-30 : une commande qui imprime un texte à coller, sans écriture dans un
autre dépôt.

## 5. Points à trancher

- [IA, tranché le 2026-11-03] `drwil report`, sans argument : versions CLI et kit (numérique seulement),
  contrôles intégrés en échec au dernier instantané run-checks, message public normalisé et instruction
  locale de reproduction. Aucun diagnostic brut, contrôle propre au projet ou champ libre ; instantané
  non réputé actuel. Les identifiants exportables et exclusions sont décrits dans la recette livrée.

## 6. Increments

- **Lot 1 — commande et recette** [IA] : commande, tests (aucun chemin absolu, aucune donnée du projet),
  recette, README et changelog. Critère de sortie : la commande, lancée sur un dépôt de test, imprime la
  version et le message d'un contrôle en échec sans chemin absolu.

## 7. Reprise

- **Dernier état** (2026-11-03) : lot 1 implémenté dans le dépôt réel : commande publique en lecture
  seule, liste fermée de champs et de messages normalisés, recette source synchronisée par l'installateur,
  documentation et contrats `QUA-231` à `QUA-234` ajoutés. Les six tests ciblés passent ; couverture
  du module : 100 % lignes, branches et fonctions. Attestation humaine de `QUA-234` reçue et
  reconnue par la vérification officielle : `node .githooks/run-checks.mjs`, code 0
  (6 avertissements, 216 contrôles repris et 15 rejoués), puis
  `node packages/drwil/bin/drwil.js verify --agent` :
  `Verdict: GOVERNANCE: PASS (exit 0)`. Les origines des quatre contrats sont renseignées.
- **Extension de périmètre** : `packages/drwil/bin/drwil.js` ajouté pour enregistrer la nouvelle
  commande dans le point d'entrée public ; les modules prévus au cadrage ne peuvent seuls la rendre accessible.
- **Évidence renouvelée** : `node packages/drwil/bin/drwil.js verify --evidence --agent` sur
  `936411c` : `Verdict: GOVERNANCE: PASS (exit 0)`, 205 PASS, 21 ATTESTED, aucun FAIL,
  ERROR ou MANUAL. Évidence : `.drwil/evidence/verify-2026-11-03T19-29-51-082Z.json` (si présent).
- **Blocage de clôture** : après passage officiel en CLOSING, `node .githooks/close.mjs` refuse
  l'écriture de la preuve : empreinte des critères acceptée `sha256:ea17be0a5b2599ff`,
  empreinte actuelle `sha256:9ccee6085b393b9a`. La comparaison avec le lecteur actuel donne cette
  même empreinte actuelle pour `77fd9c1`, `97da286`, `787710a` et `936411c` : ni l'attestation
  ni la présente reprise n'ont changé les critères. Aucune acceptation réécrite par l'agent.
- **Travail non commité** : présente reprise du blocage ; l'entrée de journal préparée a été
  retirée après le refus, aucune clôture ni suppression de fiche effectuée.
- **Prochaine étape humaine** : relire les critères puis, dans un terminal humain,
  `node .githooks/state.mjs accept`, comme demandé par l'outil officiel. Reprendre ensuite
  l'évidence complète sur le commit courant, le journal et la clôture ; pousser, ouvrir la PR et
  suivre la fusion autorisée. Rester en CLOSING tant que ce blocage subsiste ; aucune PR créée,
  aucune fusion programmée, aucun chantier suivant lancé.
- **Limites connues** : messages publics normalisés et instantané non réputé actuel, explicités
  dans la recette ; hook `.githooks/commit-msg` non exécutable préexistant, déjà consigné dans
  `docs/intentions/commit-msg-non-executable.md`. Consommation de ce chantier indisponible dans
  les sources consultées : aucun coût inventé.
