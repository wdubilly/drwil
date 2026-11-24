# Preuve de clôture — acceleration-des-controles

**Clos le** : 2026-11-24
**Commit vérifié** : `382b9a8887` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:df46d3ba574b6a1d`, acceptés par l'humain au lancement le 2026-11-24

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Pendant un lot, la conduite livrée (consignes, skill de lancement, sous-agent des contrôles) ne lance que le commit et, après un échec, les contrôles touchés et les tests cités par les contrats de la fiche, choisis par l'outil ; la passe complète reste exigée avant VERIFY et la clôture, et la CI reste complète | `QUA-327` | `tests-qua-327` | — |
| L'empreinte d'un contrôle couvre sa déclaration et la configuration qu'il lit, pas tout .drwil/ia-first.json : un contrat ajouté ne rejoue plus les autres contrôles ; la preuve de clôture garde l'empreinte de l'arbre entier | `QUA-141` | `tests-qua-141` | — |
| Une mise à jour (npx drwil init) depuis une version antérieure au nouveau calcul de l'empreinte le signale en une ligne de son compte rendu, dans la langue du projet : « première passe complète, puis reprise des verdicts » ; une mise à jour depuis une version qui le connaît déjà ne l'écrit pas | `QUA-141` | `tests-qua-141` | — |
| Avec un formateur déclaré, un commit dont un fichier indexé n'est pas formaté est refusé, sans qu'aucun fichier soit modifié, avec la commande exacte qui le formate et les fichiers en cause | `QUA-328` | `tests-qua-328` | — |
| Sans clé format, le commit est inchangé ; l'adoption la propose, une mise à jour ne l'active jamais | `QUA-329` | `tests-qua-329` | — |
| Le temps ajouté au commit par la vérification du formatage est mesuré sur un projet temporaire et rapporté au journal de clôture, sans seuil | `QUA-013` | `ci-coverage`, `tests-qua-013` | — |
| Le modèle de fiche livré recommande une recette réelle dès le premier lot d'un chantier qui touche ce que l'utilisateur installe ; dans le dépôt seul, un avertissement non bloquant le rappelle quand le bloc scope touche l'installation ou la mise à jour et que le lot 1 ne cite pas de recette réelle ; jamais de refus | `QUA-330` | `recette-reelle`, `tests-qua-330` | — |
| Dans le dépôt, un outil construit le tarball de la branche et l'installe sur des copies de marinade-poulet et drwil_walk | `QUA-331` | `tests-qua-331` | — |
| Recette du chantier par une mise à jour réelle : des copies de marinade-poulet (GitLab) et drwil_walk (GitHub) mises à jour avec un tarball du chantier ; le commit de mise à jour passe sans nouveau blocage et sans clé format ajoutée, le compte rendu signale la première passe complète ; puis un second commit qui touche un fichier du projet reprend les verdicts des contrôles non concernés (« repris ») [humain] | `QUA-332` | — | `sha256:71849373a52a8bfe` (5 fichier(s)) |
| Un projet neuf dont la couche est à la racine n'a aucun contrôle généré par le kit en paths: ["**"] : couverture, couverture du diff et e2e reçoivent les chemins du code et de sa configuration (sources, tests, configuration de l'outil, package*.json) — QUA-087, | `QUA-089` | `tests-qua-089` | — |
| Une mise à jour (npx drwil init) réécrit les paths: ["**"] des contrôles restés tels que le kit les a posés, et ceux de la paire de couverture d'une couche (coverage-<couche>, coverage-diff-<couche>) même retouchée par l'adoptant, avec les chemins calculés par le kit ; son compte rendu nomme chaque contrôle réécrit ; tout autre contrôle retouché n'est que signalé ; la barrière de périmètre admet ce commit chez l'adoptant — QUA-141, | `QUA-238` | `tests-qua-238` | — |
| drwil doctor signale un contrôle généré par le kit encore en paths: ["**"] ; --fix applique la même règle que la mise à jour : la paire de couverture d'une couche réécrite même retouchée, tout autre contrôle retouché seulement signalé (choix du demandeur le 2026-11-23) | `QUA-303` | `tests-qua-303` | — |
| Chez l'adoptant, l'adoption propose le réglage parallel quand le projet déclare plusieurs contrôles, drwil doctor le signale sur un projet qui ne l'a pas, une mise à jour ne l'active jamais ; un contrôle qui ne supporte pas le parallèle garde parallel: false | `QUA-334` | `tests-qua-334` | — |
| La page livrée des contrôles décrit les clés format, readsChecks et parallel | `QUA-333` | `tests-qua-333` | — |
| Le point doctor d'un contrôle du kit en paths: ["**"] se tait quand rien ne se délimite sous la racine | `QUA-303` | `tests-qua-303` | — |
| Un motif de paths précédé de ! exclut des fichiers ; les contrôles du dépôt sur .githooks/** ou packages/drwil/** excluent les tests des autres contrats quand ils ne les lisent pas, après audit contrôle par contrôle ; nombre de contrôles rejoués pour un fichier mesuré avant et après | `QUA-141` | `tests-qua-141` | — |
| Le garde des commandes refuse une boucle d'attente while/until sur pgrep lancée par un agent et renvoie à node .githooks/wait-command.mjs | `QUA-337` | `tests-qua-337` | — |
| drwil doctor signale un kit installé antérieur au calcul d'empreinte par contrôle (FINGERPRINT_SCHEME) : ses passes ne reprennent aucun verdict tant qu'il n'est pas mis à jour | `QUA-026` | `tests-qua-026` | — |
| Le formateur reçoit tous les fichiers indexés en un seul appel quand sa commande le permet | `QUA-328` | `tests-qua-328` | — |
