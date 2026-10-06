# Découverte de valeur et opportunités produit

> Dernier scan : 2026-10-05
> État du projet : monorepo TypeScript `drwil` (CLI `init`/`apply`,
> templates FR/EN, hooks, skills Claude Code, instructions Copilot CLI).
> Depuis le scan du 2026-10-04, plusieurs chantiers se sont clôturés
> (manifeste d'installation + désinstallation propre, CI multi-OS stable,
> alerte CI cassée, module de release avec tarball npm, suivi de
> consommation dans le tableau de bord, skills Copilot CLI) : la plupart
> des opportunités précédentes (OPT-2 à OPT-4 du scan précédent) sont
> traitées. Ce scan en propose de nouvelles.

## Aperçu de consommation

Cumul enregistré dans `.drwil/usage.jsonl` (3 entrées, toutes datées du
2026-10-04, modèle `claude-sonnet-5`) : 240 000 tokens, 160 minutes, sur 3
lots du chantier `mecanique-ia-first` (audit de risques, découverte de
valeur, suivi de consommation). Rien d'enregistré depuis sur les chantiers
clôturés le 2026-10-05 — à vérifier si l'oubli est volontaire ou une
fiche non rattachée.

## Opportunités prioritaires (matrice valeur / effort)

| ID | Fonctionnalité proposée | Pourquoi (valeur métier) | État du code existant | Effort | Action recommandée |
|---|---|---|---|---|---|
| OPT-1 | Corriger `.drwil/ia-first.json` pour que le rappel de cadrage (QUA-016) couvre le vrai code du kit | Vérifié en direct (`git add` + `node .githooks/cadrage.mjs` sur `packages/drwil/src/stack.ts`) : **aucun avertissement**, alors que c'est le cœur du générateur. Les couches déclarées (`core`, `adapters`, `plugin-opencode`, `mcp-server`, `kit-ia-first`) n'existent pas sur le disque (héritées de l'extraction run-box-v2) ; `layerPrefixes` (`app`, `tests`, `src`, `scripts`) ne matche pas `packages/drwil/src/`. Le filet de sécurité phare du kit (QUA-016) est aveugle sur son propre code. | Mécanisme déjà fonctionnel (`.githooks/cadrage.mjs`, `.githooks/check-docs.mjs`) : il suffit qu'un préfixe déclaré matche le vrai chemin. | 🟢 Faible | Remplacer les couches obsolètes par `packages/drwil/src`/`packages/drwil/test` dans `layers`/`layerPrefixes`/`codePrefixes` (à trancher : couche ou préfixe de code), vérifier que `node .githooks/cadrage.mjs` avertit désormais sur un changement de `packages/drwil/src/`. |
| OPT-2 | Publier `drwil` sur npm | Rend le kit installable par une équipe via `npx drwil init`. Le blocage technique constaté le 2026-10-04 (`docs/intentions/packager-kit-ia-first.md`, « le paquet ne fonctionne pas en l'état ») est déjà levé : vérifié ce jour, `files` déclare bien `dist`/`bin`/`templates` dans `packages/drwil/package.json`, et `npm pack --dry-run` produit un tarball de 150 fichiers avec les gabarits Copilot inclus. | Build, CLI et templates fonctionnels et déjà empaquetables (vérifié). Reste la décision produit, pas la technique. | 🟢 Faible | Mettre à jour le constat de `docs/intentions/packager-kit-ia-first.md` (blocage levé), puis trancher les questions encore ouvertes (scope public/privé, version initiale, registry) pour publier une première version. |
| OPT-3 | Adopter formellement `catalogue:QUA-005` (typage strict) dans `docs/contrats.md` | La pratique est déjà en place (`tsconfig.base.json` : `strict: true`, zéro usage de `any` dans `packages/drwil/src/*.ts` — vérifié) mais n'est pas déclarée comme contrat : rien n'empêche une régression future de passer inaperçue. | Contrat du catalogue déjà rédigé (`docs/catalogue-contrats.md`, ligne `catalogue:QUA-005`), contrôle déjà existant (mode strict du compilateur). | 🟢 Faible | Recopier la ligne dans `docs/contrats.md` (sans le préfixe `catalogue:`), la retirer du catalogue, vérifier `node .githooks/run-checks.mjs`. |
| OPT-4 | ~~Trancher le lot 2 d'« apply() rafraîchit la mécanique »~~ (clôturé le 2026-10-05, PR #21, voir docs/projets/journal.md) | — | — | — | Traité, gardé pour mémoire du scan du 2026-10-05. |

## Analyse détaillée des meilleures pistes

### OPT-1 — Réparer la couverture du rappel de cadrage sur le vrai code du kit
- **Problème résolu** : aujourd'hui, modifier `packages/drwil/src/index.ts`
  (le générateur `init`/`apply` lui-même) ne déclenche aucun rappel de
  cadrage (QUA-016), contrairement à scripts/ ou `.githooks/` qui sont
  bien couverts — vérifié en direct dans cette session (voir tableau).
- **Briques existantes réutilisables** : `.githooks/cadrage.mjs` (détection
  par préfixe, déjà fonctionnelle) ; `.githooks/check-docs.mjs` (même
  logique de préfixes connus) ; `.drwil/ia-first.json` (simple fichier de
  config à corriger, pas de code à écrire).
- **Ce qu'il reste à faire** : décider si `packages/drwil/src`/`test`
  doivent être un `layer` (avec `AGENTS.md` dédié attendu) ou un préfixe de
  code nu (`codePrefixes`, comme scripts/) — impact différent sur
  `.githooks/check-docs.mjs`. Mettre à jour la config, vérifier avec un
  changement factice staged.
- **Impact si implémenté** : le contrôle le plus structurant du kit
  (cadrage avant code) protège enfin son propre code, pas seulement les
  scripts annexes — cohérence de dogfooding, risque de régression
  silencieuse réduit.

### OPT-2 — Publier `drwil` sur npm
- **Problème résolu** : rendre le kit accessible hors du dépôt source
  (`npx drwil init`), sans dépendre d'un chemin absolu local.
- **Briques existantes réutilisables** : `packages/drwil/package.json`
  (nom, bin, `files` déjà corrects — vérifié) ; `packages/drwil/src/`
  (`init()`/`apply()` fonctionnels, 52/52 tests verts) ;
  `packages/drwil/templates/` (FR/EN complets, module de release qui sait
  déjà produire un tarball npm en conditions réelles).
- **Ce qu'il reste à faire** : rafraîchir le constat de l'intention (le
  blocage qu'elle décrit n'existe plus), puis trancher scope de
  publication, version initiale et registry.
- **Impact si implémenté** : adoption en équipe simplifiée, kit
  réellement distribuable comme annoncé dans le document technico-commercial
  (DOC_TECHNICO_COMMERCIAL.md, volontairement hors suivi git).

### OPT-3 — Déclarer le typage strict comme contrat actif
- **Problème résolu** : une pratique de qualité déjà respectée
  (`strict: true`, 0 `any`) n'est protégée par aucun contrat documenté :
  un futur assouplissement de `tsconfig` passerait sans alerte.
- **Briques existantes réutilisables** : ligne prête dans
  `docs/catalogue-contrats.md` (`catalogue:QUA-005`) ; contrôle déjà en
  place (`tsc --build` dans les `checks` de `.drwil/ia-first.json`).
- **Ce qu'il reste à faire** : déplacer la ligne du catalogue vers le
  registre, aucun changement de code.
- **Impact si implémenté** : plus petit effort de ce scan, ferme un trou
  de gouvernance sans toucher une ligne de TypeScript.

### OPT-4 — Résoudre la dérive de prose détectée par `apply()`
- **Problème résolu** : la détection de dérive (AGENTS.md, docs/ia-first.md,
  docs/contrats.md restés sur une version pré-kit) tourne déjà mais
  n'aboutit à rien d'actionnable pour qui l'exécute.
- **Briques existantes réutilisables** : lot 1 déjà codé et testé
  (chantier clôturé depuis le 2026-10-05, voir docs/projets/journal.md).
- **Ce qu'il reste à faire** : une décision de conception (comment
  présenter/résoudre la dérive) avant tout code du lot 2.
- **Impact si implémenté** : `apply()` devient réellement utile pour garder
  un projet aligné avec les évolutions du kit, pas seulement pour les
  détecter.

## Prochaine étape

Choisir un ID et répondre : « Valide OPT-X pour la convertir en
intention ».
