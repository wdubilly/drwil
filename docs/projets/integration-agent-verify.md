# Projet : intégration agent de `drwil verify` (sans franchir la frontière d'attestation)

**Statut** : cadré le 2026-10-06 — lots 1 à 4 livrés sur la branche, essai réel fait (lot 5 : attestation humaine à faire par le demandeur).
**Risque** : HIGH

<!-- cadrage
fichiers:
  - packages/drwil/templates/fr/tools/claude/.claude/skills/drwil/SKILL.md
  - packages/drwil/templates/en/tools/claude/.claude/skills/drwil/SKILL.md
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/src/agent.ts
  - packages/drwil/bin/drwil.js
-->

(cadrage provisoire : le skill `/drwil` existant et les tests ; chaque lot
y ajoute les fichiers qu'il touche réellement. Branche partie de
`chantier/drwil-v0-2`, dont elle dépend : `verify`, `attest`, JSON v1.)

## 1. Besoin

Faire de `drwil verify` la primitive qu'un agent (Claude, Codex, Cursor…)
utilise pour savoir si son travail est gouverné, et préparer une
intégration slash-command, sans rendre drwil dépendant d'un agent et sans
jamais franchir la frontière de confiance posée par `drwil attest`.

Principe à préserver :

> L'agent peut construire et produire des preuves. DRWIL peut vérifier ces
> preuves. L'humain peut produire une attestation humaine. L'agent ne peut
> jamais s'attester lui-même.

Workflow cible :

```text
Agent : drwil verify
DRWIL : PASS / FAIL / ERROR / MANUAL
  PASS   → continuer ou terminer
  FAIL   → corriger, relancer drwil verify
  ERROR  → signaler le problème de vérification, ne jamais prétendre vérifié
  MANUAL → arrêter la prétention de validation ; « Human attestation
           required. » + liste des contrats + commande humaine
           `drwil attest <CONTRACT_ID>`, jamais exécutée par l'agent
Humain si MANUAL : drwil attest <id> (terminal interactif)
Puis : drwil verify → verdict vérifié
```

## 2. Hors périmètre

- Toute forme de `/drwil attest` ou d'attestation déclenchable par un agent.
- Réimplémenter une règle de `verify` dans l'intégration : elle invoque la
  CLI (`drwil verify --json`) et présente le résultat, rien de plus.
- Intégrations Codex, Cursor et autres (préparées par la séparation, pas
  livrées ici).
- Modifier le moteur de gouvernance pour un agent particulier.

## 3. Contraintes

- La CLI `drwil` reste la source de vérité ; l'intégration est un
  adaptateur (ADR-003 de `docs/projets/drwil-v0-2-gouvernance-executable.md` :
  un seul moteur).
- Cœur découplé de Claude Code : les fichiers propres à Claude restent sous
  `packages/drwil/templates/*/tools/claude/`, jamais dans `packages/drwil/src/`.
- Le skill `/drwil` existe déjà (menu de capacités, argument) : l'étendre,
  ne pas en créer un second.
- QUA-019 : aucun contournement d'un contrôle ; QUA-013 : un résultat non
  établi n'est jamais présenté comme un succès ; SEC-007 : rien de sensible
  dans la sortie présentée à l'agent.
- QUA-018 : livrable (gabarit Claude) et dépôt (doc, tests).

## 4. Décisions

- 2026-10-06 : chantier demandé par le demandeur ; `attest` reste
  exclusivement humain, la séparation agent / humain est une propriété de
  sécurité à tester. [décision utilisateur]
- 2026-10-06 : drwil ne cherche pas à prouver qu'un humain a tapé
  `attest` ; il exige qu'une attestation soit explicite, traçable et
  soumise à la revue du changement. Attestation fabriquée : option (a),
  assumée et documentée (pas de hook anti-falsification maintenant,
  CODEOWNERS hors du cœur et de la V0.2, signature hors périmètre).
  Verdict CLI : garder `GOVERNANCE: PASS` ; JSON v1 inchangé ; pas de
  `/drwil status` ; `/drwil verify` oui ; consigne dans `AGENTS.md` pour
  les autres agents ; `drwil attest` par un agent toujours interdit.
  [décision utilisateur]
- 2026-10-06 : la présentation pour l'agent est une option neutre de la
  CLI, `drwil verify --agent` (anglais, stable), qui ne fait que mettre en
  forme le JSON v1 ; le skill `/drwil verify` l'appelle. Un futur
  adaptateur Codex ou Cursor réutilise la même sortie. [par défaut]

## 5. Points à trancher

(aucun restant : tranchés le 2026-10-06, voir section 4)

## 6. Lots

- **Lot 1 — Présentation agent du verdict** [IA] : à partir de
  `drwil verify --json` (aucune règle recalculée), une sortie destinée à
  l'agent : compteurs PASS / ATTESTED / FAIL / ERROR / MANUAL, verdict,
  conduite à tenir par statut ; si MANUAL, « Human attestation required. »,
  la liste des contrats et la commande `drwil attest <ID>` présentée comme
  action humaine. Critère de sortie : tests PASS, FAIL, ERROR, MANUAL.
- **Lot 2 — `/drwil verify` (Claude Code)** [IA] : argument `verify` du
  skill `/drwil` existant (fr/en), qui appelle la CLI et applique le
  workflow de la section 1 ; jamais d'argument `attest`. Critère de sortie :
  test qui vérifie que le skill ne contient ni n'invoque `attest`.
- **Lot 3 — Frontière d'attestation testée** [IA, après décision de la
  section 5] : exécution non interactive, stdin redirigé, `--yes` ou
  équivalent, invocation depuis un script, attestation créée à la main,
  tentative de faire croire à `verify` qu'une attestation existe ; et une
  attestation réellement produite par `drwil attest` reconnue ensuite.
  Critère de sortie : tests verts, y compris l'option retenue contre la
  fabrication manuelle.
- **Lot 4 — Doc « Workflow agent / humain »** [IA] : section dans
  `docs/ia-first.md` du gabarit (fr/en) et le README du paquet, avec le
  schéma Agent → DRWIL → Humain → DRWIL. Critère de sortie : `check-docs`
  vert, exemple rejoué par un test si possible.
- **Lot 5 — Essai réel** [humain + IA] : `/drwil verify` sur ce dépôt, puis
  une attestation faite par l'humain dans son terminal, puis `verify`.

## 7. Reprise

- **Dernier état** (2026-10-06) : lot 1 `drwil verify --agent`
  (`packages/drwil/src/agent.ts`) ; lot 2 argument `verify` du skill
  `/drwil` (fr/en), sans argument `attest`, consigne dans `AGENTS.md`
  (gabarit fr/en et dépôt) ; lot 3 tests de frontière (`--yes`, stdin
  redirigé, script, leurres, attestation manuelle visible en revue, vraie
  attestation reconnue) ; lot 4 doc « Workflow agent / humain »
  (`docs/ia-first.md` du gabarit, README). Essai réel : `verify --agent`
  sur ce dépôt, 7 contrats « Human attestation required. ».
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] attester dans son terminal (lot 5), puis
  relancer `verify` ; relire la branche `chantier/integration-agent`
  (partie de `chantier/drwil-v0-2`).
