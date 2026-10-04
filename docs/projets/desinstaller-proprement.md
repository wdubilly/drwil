# Projet : manifeste des fichiers installés + désinstallation propre

**Statut** (2026-10-04) : lot 1 livré (manifeste des fichiers installés). Lot 2 (désinstallation) non commencé.

<!-- cadrage
fichiers:
  - packages/drwil/src/index.ts
-->

## 1. Besoin

`init()`/`apply()` n'écrasent jamais un fichier existant (sécurité
voulue), mais rien ne retire jamais un fichier non plus : aucune
désinstallation propre possible aujourd'hui. Pire, rien n'identifie
formellement *quels* fichiers du dépôt appartiennent au kit — un humain
ou une IA qui voudrait nettoyer doit deviner (par chemin, en espérant
que rien n'a été renommé).

Ce besoin recoupe un point déjà ouvert : `docs/projets/suites-kit-portable.md`
(point 3, « mise à jour depuis une ancienne version ») proposait déjà
l'idée d'une liste de fichiers, supprimés seulement s'ils sont
identiques au modèle d'origine — exactement le mécanisme qu'il faut ici.
Un seul manifeste doit donc servir les deux usages (désinstallation et
nettoyage de fichiers obsolètes d'une version antérieure), pas deux
mécanismes parallèles.

## 2. Hors périmètre

- Nettoyer effectivement les fichiers obsolètes d'anciennes versions du
  kit (point 3 de `docs/projets/suites-kit-portable.md`) : ce chantier
  construit le manifeste qui le rendra possible, mais ce nettoyage reste
  un chantier séparé à reprendre une fois le manifeste en place.
- Désinstaller `docs/projets/`, `docs/intentions/`, `docs/recettes/` : ce
  sont des fiches et décisions produites par l'utilisateur/l'IA au fil du
  temps, pas de la mécanique du kit — jamais retirées automatiquement,
  même si leur contenu initial (gabarit vide) a été copié par le kit.
- Revenir sur un fichier modifié depuis l'installation : jamais supprimé
  automatiquement (voir décisions).

## 3. Contraintes

- Le manifeste ne doit pas casser la règle « une information, une seule
  source » : il décrit ce qui a été écrit, il ne duplique pas la
  configuration déjà présente dans `.drwil/ia-first.json`.
- Les fichiers déjà installés *avant* ce lot n'auront pas d'entrée dans
  le manifeste (limite connue et assumée, documentée en section 4) : le
  manifeste ne couvre que les installations faites après son
  introduction, pas rétroactivement.

## 4. Décisions

- (2026-10-04) Portée de la suppression : seulement la mécanique du kit
  (`.githooks/`, `.claude/` et dossiers équivalents des autres outils,
  `.drwil/`, fichiers CI, `AGENTS.md`/pointeurs `CLAUDE.md`/`GEMINI.md`).
  Jamais `docs/projets/`, `docs/intentions/`, `docs/recettes/`.
- (2026-10-04) Fichier modifié depuis l'installation (empreinte différente
  de celle du manifeste) : jamais supprimé automatiquement — signalé à
  l'utilisateur pour décision manuelle.
- (2026-10-04) Mécanisme : un manifeste (liste de fichiers + empreinte du
  contenu écrit par le kit), réutilisé tel quel pour le nettoyage de
  fichiers obsolètes du point 3 de `suites-kit-portable.md` (pas deux
  mécanismes séparés).
- (2026-10-04) Interface : pas une commande qui devine — un flag/fichier
  qui identifie formellement les fichiers liés au kit. Concrètement : un
  manifeste `.drwil/fichiers-installes.json` (à créer) (chemin relatif +
  empreinte sha256), écrit/mis à jour par `init()`/`apply()` à chaque fichier
  réellement écrit. La désinstallation elle-même (lot 2) consomme ce
  manifeste via une sous-commande CLI dédiée.

## 5. Points à trancher

(aucun — les 4 décisions ci-dessus couvrent le périmètre)

## 6. Lots

- **Lot 1 — manifeste des fichiers installés** [IA] — **fait le 2026-10-04**.
  Implémenté dans `packages/drwil/src/index.ts` : `writeOut()` enregistre
  chemin relatif + empreinte sha256 de chaque fichier réellement écrit
  dans un objet manifeste, passé par `copyTree()`/`scaffold()` ; `init()`
  et `apply()` fusionnent ce manifeste avec .drwil/fichiers-installes.json
  existant (jamais réécrit intégralement) via `writeManifest()`. Bug
  rencontré et corrigé en cours de route : gitleaks (règle
  `generic-api-key`) confondait les empreintes sha256 hexadécimales du
  manifeste avec des clés secrètes → ajout de `.gitleaks.toml` (template
  `common/base` + racine de drwil) avec une entrée d'allowlist dédiée à ce
  fichier. Test dédié : manifeste créé avec les chemins attendus après
  `init()`, inchangé après un `apply()` sans modification (fusion sans
  perte). 40/40 tests verts.
- **Lot 2 — commande de désinstallation** [IA] : nouvelle sous-commande
  CLI (`drwil uninstall`, ou `--uninstall` — à préciser à l'implémentation
  selon ce que `commander` permet le plus proprement). Lit le manifeste,
  exclut tout chemin sous `docs/projets/`, `docs/intentions/`,
  `docs/recettes/` même s'il y figure, compare l'empreinte de chaque
  fichier restant à celle du manifeste : identique → supprimé (+ dossiers
  vides résultants) ; différente → listé en sortie comme « modifié depuis
  l'installation, non supprimé ». Mode simulation par défaut
  (`--dry-run` ou équivalent déjà présent dans les conventions du CLI) à
  confirmer avant suppression réelle. Critère de sortie : test ajouté
  (cas passant : fichier intact supprimé ; cas non passant : fichier
  modifié signalé et conservé), preuve manuelle sur un dossier `/tmp`
  (installer, modifier un fichier, désinstaller, vérifier l'état final).

## 7. Reprise

- **Dernier état** (2026-10-04) : lot 1 livré. `writeOut()`, `copyTree()`,
  `scaffold()`, `init()` et `apply()` modifiés dans
  `packages/drwil/src/index.ts` pour écrire/fusionner
  .drwil/fichiers-installes.json (chemin + sha256) à chaque fichier
  réellement écrit. `.gitleaks.toml` ajouté (template + racine) pour
  éviter un faux positif gitleaks sur les empreintes sha256. Test dédié
  ajouté dans `packages/drwil/test/kit.test.mjs`. 40/40 tests verts,
  `.githooks/run-checks.mjs` vert.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] ouvrir le lot 2 (sous-commande de
  désinstallation qui consomme ce manifeste).
