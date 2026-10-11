# Projet : init et apply gardent les réglages d'un projet déjà installé

**Statut** : cadré le 2026-10-12 — décisions prises, lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - packages/drwil/src/index.ts
  - packages/drwil/bin/drwil.js
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/README.md
  - docs/contrats.md
-->

## 1. Besoin

Relancer `drwil init` sur un projet déjà installé, geste documenté pour
mettre le kit à jour, efface en silence ses réglages (reproduit le
2026-10-12, en dehors du dépôt, sur deux projets d'essai) :

- `layerPrefixes`, `codePrefixes`, `extraCodeFiles` et `extraCodeGlobs`
  reviennent à leurs défauts : un dossier ou un fichier déclaré comme code
  sort du rappel de cadrage (QUA-016) et de la barrière de périmètre, sans
  message ;
- sans `--ci`, `ciFiles` devient vide ; sans `--layers`, `layers` devient
  `backend,frontend`, avec ces deux dossiers créés ; sans `--mode`, le mode
  repasse à `full` ;
- sur un projet anglais avec Claude seul : `lang` repasse à `fr` et les
  documents français s'installent à côté des anglais ; les cinq outils
  sont réactivés (règles Cursor, consignes Copilot, `GEMINI.md`).

`drwil apply` part des mêmes valeurs par défaut : il ajoute lui aussi les
fichiers d'outils et de couches que le projet n'avait pas choisis.

Pourquoi maintenant : le défaut affaiblit la gouvernance sans le dire, et
le refactor de `packages/drwil/src/index.ts` (vague 4) touchera ce même
code ; ce correctif lui fournit d'abord ses tests de caractérisation. Le
paquet n'est pas encore publié : aucun utilisateur touché à ce jour.

## 2. Hors périmètre

- Fusionner `init` et `apply` en une seule commande : décidé le
  2026-10-12, à mener avec le passage à l'anglais
  (`docs/intentions/livrable-full-english.md`), pour ne renommer qu'une
  fois.
- Toute autre évolution de l'installation (dérive, désinstallation,
  manifeste).

## 3. Contraintes

- **Cause racine** (établie le 2026-10-12) :
  1. `writeConfig` écrit en dur `layerPrefixes`, `codePrefixes`,
     `extraCodeFiles`, `extraCodeGlobs`, et recalcule `ciFiles` d'après
     `--ci`, au lieu de reprendre la valeur existante comme il le fait déjà
     pour `checks`, `cadrage`, `transitions`, `barriere` et
     `nouvellesExigences` ;
  2. la CLI donne des valeurs par défaut à `--lang`, `--tools`, `--ci`,
     `--contract-prefixes` et `--mode`, et `init` impose `backend,frontend`
     pour `--layers` : une option absente ne se distingue pas d'un choix
     explicite, et la config existante n'est jamais relue.
- Une installation neuve garde exactement les défauts actuels.
- `docs/recettes/corriger-un-defaut.md` : tests écrits d'abord et vus
  échouer pour la bonne raison avant la correction.
- `outils/installer-depot.mjs` passe toutes ses options explicitement : il
  n'est pas touché.

## 4. Décisions

- **2026-10-12 — Corriger maintenant, avant le refactor** (demandeur) :
  inséré en tête de ce qui reste de la vague 4.
- **2026-10-12 — Une seule règle pour init et apply** (demandeur) : config
  présente → une option absente prend la valeur de la config ; une option
  passée la remplace ; sans config, les défauts actuels.
- **2026-10-12 — `--force` conserve la config** (demandeur) : `--force` ne
  vise que les fichiers du gabarit ; repartir de zéro, c'est supprimer
  `.drwil/ia-first.json`, geste explicite.
- **2026-10-12 — Commande unique plus tard** (demandeur) : voir hors
  périmètre.

## Contrats concernés

- **QUA-016** — Rappel de cadrage : il dépend des préfixes de code que le
  défaut efface.
- **QUA-013** — Contrôle non exécuté n'est pas passé : un réglage perdu ne
  doit pas rendre un contrôle muet sans le dire.
- **QUA-004** — Seuil de couverture : les nouveaux cas sont testés.

Candidats du catalogue rendus réels : v1:INI-005 (les modifications du
projet sont préservées par défaut), v1:INI-010 (la configuration existante
est détectée avant installation).

## 5. Points à trancher

Aucun.

## 6. Lots

- **Lot 1 — Tests du défaut** [IA] : dans `packages/drwil/test/kit.test.mjs`,
  un projet installé avec des réglages choisis (langue, outils, couches, CI,
  mode, préfixes de code) puis `init` relancé sans option, puis avec
  `--force`, puis `apply` : la config et les fichiers installés ne changent
  pas. Une option passée explicitement remplace bien la valeur. Critère de
  sortie : tests vus échouer sur le code actuel, pour la bonne raison.
- **Lot 2 — Correction** [IA] : les options de la CLI n'ont plus de défaut
  propre (les défauts vivent dans la résolution) ; la résolution lit la
  config existante ; `writeConfig` reprend les valeurs déjà présentes. Aide
  de la CLI et `packages/drwil/README.md` à jour. Critère de sortie : tests
  du lot 1 verts, `node .githooks/run-checks.mjs` vert, `drwil verify`
  PASS.

## 7. Reprise

- **Dernier état** (2026-10-12) : fiche cadrée, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancement par `/drwil-lancer`.
