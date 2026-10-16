# Projet : un cadrage complet du premier coup, un élargissement sans friction

**Statut** : cadré le 2026-10-16.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/scope.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - packages/drwil/templates/common/base/.githooks/risk.mjs
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
  - packages/drwil/templates/common/base/docs/ia-first.md
  - packages/drwil/templates/common/base/docs/projects/model-brief.md
  - .githooks/scope.mjs
  - .githooks/scope-gate.mjs
  - .githooks/risk.mjs
  - .githooks/engine.mjs
  - .githooks/check-docs.mjs
  - .githooks/scope.test.mjs
  - .githooks/scope-gate.test.mjs
  - .githooks/risk.test.mjs
  - .githooks/engine.test.mjs
  - .githooks/check-docs.test.mjs
  - .githooks/run-checks.test.mjs
  - .drwil/ia-first.json
  - packages/drwil/templates/common/tools/claude/.claude/hooks/scope-reminder.mjs
  - .claude/hooks/scope-reminder.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/ia-first.md
  - docs/projects/model-brief.md
  - docs/contracts.md
-->

(cadrage : chaque fichier du gabarit avec sa copie du dépôt, ses tests,
la configuration des contrôles et le registre — ce que ce chantier
apprend justement à ne plus oublier ; les copies se régénèrent par
`npm run installer-depot`, QUA-018 (dépôt vs livrable).)

## 1. Besoin

Intention : `docs/intentions/cadrage-copies-et-elargissement.md`. Le
2026-10-15, cinq élargissements de cadrage en un chantier ; le 2026-10-16,
encore quatre (copie du dépôt de `docs/ia-first.md`, `.drwil/ia-first.json`
pour le contrôle propre d'un contrat créé, bouchon de
`.githooks/run-checks.test.mjs`, fiche mécanique du gabarit). Chaque oubli
coûte un commit d'élargissement ; et comme le hook de commit rejoue tous
les tests sur l'arbre de travail, il faut mettre le lot en cours de côté
(`git stash`) le temps de ce commit. Sur un vrai projet, c'est la première
friction rencontrée.

## Critères d'acceptation

(contrat à créer par ce chantier, avec son champ Origine.)

- Un fichier du gabarit cité dans le bloc scope couvre aussi sa copie,
  déduite d'un réglage `scopeMirrors` de `.drwil/ia-first.json` (paires de
  préfixes source → copie ; ce dépôt y déclare son gabarit) — `QUA-035`
- `check-docs` avertit une fiche dont le cadrage cite du code sans aucun
  fichier de test, ou dont un critère crée un contrat sans que le cadrage
  cite la configuration des contrôles (`.drwil/ia-first.json`, où vit le
  contrôle propre du contrat) — `QUA-035`
- Un commit qui ne touche que des fiches ne rejoue pas les contrôles hors
  documentation : ils sont signalés « non exécutés », rejoués au push et
  en CI (QUA-013) — `QUA-035`

## 2. Hors périmètre

- Bloquer une fiche au cadrage incomplet (non retenu le 2026-10-16 :
  avertissement, l'humain juge).
- Deviner le test d'un fichier précis : l'avertissement porte sur un
  cadrage de code sans aucun test.
- Toucher `outils/miroirs.json` : la copie d'un fichier se déclare par le
  réglage générique, utilisable aussi par un projet utilisateur.

## 3. Contraintes

- Livrable et dépôt : `scopeMirrors` est un réglage générique, absent par
  défaut (aucun effet chez un utilisateur qui ne le déclare pas).
- `.githooks/check-docs.mjs` est à 398 lignes (QUA-001, plafond 400) : les
  avertissements de cadrage vivent dans `.githooks/risk.mjs`, dont
  check-docs affiche déjà les avertissements ; la lecture du cadrage et
  des copies dans `.githooks/scope.mjs`.
- Un contrôle non rejoué au commit reste visible (« non exécuté »), jamais
  un succès, et toujours rejoué au push et en CI (QUA-013, un contrôle non
  exécuté n'est pas passé).
- Contrats à citer : QUA-013, QUA-016 (rappel de cadrage), QUA-018,
  QUA-033 (un contrôle par règle).

## 4. Décisions

Tranchées par le demandeur le 2026-10-16 (sondage) :

- Copies : un fichier du gabarit cadré couvre sa copie, déduite d'un
  réglage de correspondance.
- Oublis : un contrôle au cadrage (avertissement), pas un simple rappel.
- Commit de fiche seule : ne rejoue que ce qu'il indexe.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — copies couvertes** [IA] : `scopeMirrors` lu par
  `.githooks/scope.mjs` ; la barrière de périmètre et le rappel de cadrage
  l'appliquent ; ce dépôt le déclare. Critère de sortie : tests (copie
  couverte, fichier hors correspondance refusé, sans réglage inchangé).
- **Lot 2 — oublis signalés au cadrage** [IA] : avertissements dans
  `.githooks/risk.mjs` (code sans test, contrat créé sans la configuration
  des contrôles) ; modèle de fiche mis à jour. Critère de sortie : tests,
  en français et en anglais.
- **Lot 3 — commit de fiche seule** [IA] : au commit, si tous les
  fichiers indexés sont des fiches, le moteur ne rejoue que les contrôles
  de la documentation et signale les autres « non exécutés ». Critère de
  sortie : tests (fiche seule, fiche et code) ; doc livrée mise à jour ;
  contrat créé ; `drwil verify` évalue chaque critère prouvé.

## 7. Reprise

- **Dernier état** (2026-10-16) : fiche cadrée ; aucun code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
