# Catalogue de contrats à adopter

Contrats **génériques** fréquents, pas installés par défaut (seul le socle de
`docs/contrats.md` l'est). Préfixe `catalogue:` : évite qu'un ID pas encore
adopté soit pris pour un trou du registre (même mécanisme que pour un ID
d'un autre dépôt). Un projet qui adopte une ligne la recopie **sans ce
préfixe** dans le tableau de `docs/contrats.md`, adaptée à sa pile, puis la
retire d'ici une fois active (pas de doublon entre catalogue et registre).
Voir `docs/recettes/adopter-le-kit.md` pour la démarche d'adoption.

Les contrats très spécifiques à un métier (ex. un format de document RH, un
protocole propre à un partenaire) ne sont **pas** dans ce catalogue : ils se
rédigent au fil de l'eau, directement dans le registre du projet, sur le
modèle des lignes ci-dessous.

| ID | Règle | Périmètre | Contrôle type (à adapter à la pile) |
|---|---|---|---|
| catalogue:SEC-001 | Toute route déclare la permission qu'elle exige ; refus par défaut si rien n'est déclaré. | routes de l'API | script qui liste les routes sans déclaration de permission |
| catalogue:SEC-002 | Le front masque une action interdite, le backend la revalide toujours : aucune décision d'autorisation ne repose sur le seul front. | backend | test d'intégration : appel direct sans passer par le front, sur un rôle sans le droit |
| catalogue:SEC-009 | Toute donnée entrante (requête, fichier importé, webhook) est validée/nettoyée à la frontière, jamais utilisée telle quelle. | points d'entrée de l'API | schéma de validation systématique (ex. zod, pydantic) sur chaque route |
| catalogue:SEC-011 | Donnée personnelle : minimisée, accès restreint, jamais en clair dans un log ou une sortie d'IA. | tout le dépôt | revue humaine + grep des champs connus dans les logs (preuve partielle, à documenter comme telle) |
| catalogue:SEC-012 | Licence de chaque dépendance compatible avec celle du projet ; pas de copyleft fort introduit sans revue explicite. | dépendances du projet | outil de scan de licences (ex. `license-checker`, `pip-licenses`) en CI, liste blanche déclarée |
| catalogue:QUA-001 | Un fichier de code ne dépasse pas un plafond de lignes ; un fichier déjà au-dessus à l'adoption est plafonné à sa taille actuelle (ne peut que maigrir). | code source du projet | `.githooks/check-file-size.mjs` (livré par le kit, opt-in — voir `docs/recettes/refactorer-sans-casser.md`) |
| catalogue:QUA-002 | Une erreur n'est jamais avalée en silence (bloc `catch` vide, promesse rejetée sans gestion) : au minimum elle est journalisée, le cas échéant propagée. | code source du projet | lint (ex. `no-empty`, `no-floating-promises`) ou script dédié selon la pile |
| catalogue:QUA-003 | La CI installe les dépendances en mode verrouillé (lockfile figé, pas de résolution de version à la volée). | pipeline CI | `npm ci` / équivalent verrouillé de la pile, jamais `npm install` en CI |
| catalogue:QUA-005 | Typage strict activé, aucun type `any`/dynamique non justifié. | code source du projet | mode strict du compilateur/typechecker de la pile |
| catalogue:QUA-006 | Un module de logique pure (sans effet de bord) a son fichier de test juste à côté. | code source du projet | règle de lint ou script dédié selon la pile |
| catalogue:QUA-007 | Le lint ne tolère aucun avertissement. | code source du projet | lint de la pile en mode strict (zéro avertissement toléré) |
| catalogue:QUA-008 | Une suppression de type (`as any`, `# type: ignore`, `@ts-ignore`…) est accompagnée d'un commentaire qui justifie la raison, pas seulement la suppression elle-même. | code source du projet | script de lint qui exige un commentaire adjacent à chaque suppression connue de la pile |
| catalogue:QUA-009 | Un test désactivé (`skip`, `xit`, `@Disabled`…) cite explicitement l'ID d'une fiche ouverte de `docs/projets/` qui justifie la désactivation (QUA-019 appliqué aux tests). | code source du projet, `docs/projets/` | script qui liste les tests désactivés sans citation de fiche à côté |
| catalogue:QUA-014 | Contraste texte/fond RGAA 4.1 / WCAG AA (4,5:1, 3:1 pour le gros texte), clair et sombre. | écrans du front | `.githooks/check-colors.mjs` (à créer), `.githooks/check-contrast.mjs` (à créer) — copiés depuis `templates/common/optional/front-quality/` du paquet du kit, voir son README |
| catalogue:QUA-020 | Les parcours critiques du projet sont couverts par un test de bout en bout automatisé, rejoué en CI. | parcours critiques identifiés par le projet | test e2e (ex. Playwright, Cypress) par parcours, job CI dédié |

Pour ce dépôt, `catalogue:QUA-004` a été adopté — voir `QUA-004` dans
`docs/contrats.md` et `docs/projets/adopter-seuil-couverture.md`. Il se
complète dans le temps avec `catalogue:QUA-020` : un seuil de couverture
déclaré bas d'abord pour ne pas bloquer un projet qui démarre, relevé au
fil de l'eau, puis un e2e automatisé sur les parcours critiques
(`catalogue:QUA-020`) comme preuve de couverture comportementale réelle —
pas seulement un pourcentage de lignes. Contrairement aux autres lignes de
ce catalogue, `catalogue:QUA-020` n'est pas une pratique observée telle
quelle dans un projet existant (l'e2e y reste manuel) : c'est un objectif
propre à drwil, pas un report direct.

Les contrats très spécifiques à run-box-v2 (documents RH, pont SSH, portail
isolé, Elasticsearch, ERMv2…) ne sont pas repris ici : ils ont servi
d'**exemples** pendant la conception du kit, pas de modèle à installer.
