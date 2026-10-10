# Projet : un livrable qui ne ralentit ni ne casse l'utilisateur

**Statut** : cadré le 2026-10-10 — décisions prises le 2026-10-11, lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - .githooks/moteur.mjs
  - packages/drwil/templates/common/base/.githooks/moteur.mjs
  - .githooks/check-docs.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
  - packages/drwil/src/index.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/templates/common/base/.githooks/cadrage.test.mjs
  - packages/drwil/templates/common/base/.githooks/contrats.test.mjs
  - packages/drwil/templates/common/base/.githooks/etat.test.mjs
  - packages/drwil/templates/common/base/.githooks/perimetre.test.mjs
  - packages/drwil/templates/common/base/.githooks/risque.test.mjs
  - .drwil/ia-first.json
  - packages/drwil/templates/fr/base/docs/ia-first.md
  - packages/drwil/templates/en/base/docs/ia-first.md
  - packages/drwil/templates/fr/base/docs/projets/mecanique-ia-first.md
  - packages/drwil/templates/en/base/docs/projects/kit-mechanics.md
-->

(cadrage : ce que le kit lance au commit de l'utilisateur, la sévérité des
nouvelles exigences à la mise à jour, l'installation, et leurs tests —
QUA-018 (périmètre explicite : dépôt drwil vs livrable gabarit).)

## 1. Besoin

Principe posé par le demandeur le 2026-10-10 : « il ne faut pas ralentir
l'utilisateur ni casser quoi que ce soit, donc il faut distinguer ce qu'on
lui livre et notre repo qui éprouve la solution ». Le livrable reste
léger ; ce dépôt éprouve tout (plus de tests, plus de contrôles, plus de
sévérité) sans le faire payer à l'utilisateur.

Constats du même jour :

- **les tests des hooks sont livrés et tournent à chaque commit de
  l'utilisateur** : les 5 fichiers `.githooks/*.test.mjs` du gabarit,
  lancés par le contrôle « tests des contrôles eux-mêmes »
  (`.githooks/moteur.mjs`) en mode `full`, le mode par défaut ; environ
  une seconde par commit aujourd'hui, davantage avec la couverture à 100 %
  (`docs/projets/couverture-hooks.md`) — pour tester le code de drwil,
  pas celui de l'utilisateur ;
- **deux changements du jour peuvent casser un projet existant à la mise
  à jour** (rien n'est encore publié : dernière release `v0.3.0`) :
  - un chemin cité qui n'existe que comme fichier ignoré par Git devient
    une **erreur** de check-docs (PR #26) : un projet qui commitait hier
    peut être refusé ;
  - seul `**Statut** : terminé le AAAA-MM-JJ` vaut terminé (PR #20) : les
    fiches qui disaient « fait » réapparaissent au lancement.

## 2. Hors périmètre

- Retirer quoi que ce soit des contrôles de ce dépôt : ici, tout reste
  aussi sévère.
- La publication npm (`docs/intentions/packager-kit-ia-first.md`).

## 3. Contraintes

- Rien de ce qui est livré ne doit ralentir le commit de l'utilisateur
  sans nécessité pour son projet à lui.
- Une nouvelle exigence ne bloque jamais un projet existant à la mise à
  jour : `apply` ne durcit jamais un réglage existant (comme le réglage du
  rappel de cadrage, QUA-016).
- Les tests du kit (installation de vrais projets sur les trois OS)
  restent la preuve de ce qui est livré.

## 4. Décisions

- **2026-10-10 — Livrable léger, dépôt éprouvé** : principe retenu par le
  demandeur, priorité 0, avant la couverture à 100 %. [décision
  utilisateur]
- **2026-10-11 — Tests des hooks non livrés** (point 5) : les 5 fichiers
  `.githooks/*.test.mjs` sortent du gabarit et restent dans ce dépôt
  (lancés ici au commit et en CI) ; chez un projet existant, la mise à
  jour les supprime s'ils sont intacts (mécanisme des fichiers obsolètes
  d'`init` / `apply`) ; dans un projet sans ces tests, le contrôle
  « tests des contrôles eux-mêmes » ne doit ni échouer ni se dire « non
  exécuté » (QUA-013). [décision utilisateur]
- **2026-10-11 — Un réglage « progressif » unique** (point 5) : les
  exigences ajoutées après l'installation d'un projet restent en
  avertissement chez lui ; une nouvelle installation les a bloquantes ;
  `apply` ne durcit jamais. [décision utilisateur]
- **2026-10-11 — Budget mesuré puis fixé** (point 5) : le lot 3 mesure le
  commit d'un projet généré sur les trois OS, puis fixe la limite à la
  mesure plus une marge ; elle ne monte jamais sans décision. [décision
  utilisateur]
- **2026-10-11 — Cadrage élargi** : le réglage « progressif » vit dans
  `.drwil/ia-first.json` (ce dépôt le pose à « bloquant ») et se documente
  dans la doc du gabarit (fr, en).

## Contrats concernés

- **QUA-018** — Périmètre explicite : dépôt drwil vs livrable gabarit.
- **QUA-016** — Rappel de cadrage : modèle de sévérité réglable, jamais
  durcie par une mise à jour.

## 5. Points à trancher

- ~~Les trois points~~ — tranchés le 2026-10-11 (voir « Décisions »).

## 6. Lots

- **Lot 1 — commit léger** [IA] : tests des hooks hors du commit de
  l'utilisateur selon la décision ; ce dépôt continue de les lancer.
  Critère de sortie : un projet généré ne lance plus ces tests au commit ;
  ce dépôt, si.
- **Lot 2 — mise à jour sans casse** [IA] : sévérité des deux nouvelles
  exigences selon la décision ; test du kit qui installe un projet comme
  en `v0.3.0`, le met à jour, et vérifie qu'aucun commit qui passait n'est
  refusé. Critère de sortie : ce test vert sur les trois OS.
- **Lot 3 — budget de temps** [IA] : mesure du temps de commit d'un projet
  généré, limite selon la décision. Critère de sortie : un ralentissement
  au-delà du budget fait échouer les tests du kit.

## 7. Reprise

- **Dernier état** (2026-10-10) : fiche cadrée, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] `/drwil-lancer`.
