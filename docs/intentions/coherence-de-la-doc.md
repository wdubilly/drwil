# Intention : une documentation qui reste juste : renvois, citations, index, doc visiteur

**Statut** : proposée le 2026-10-26 — rangement du backlog : découpage de `petits-defauts` par thème (décision du demandeur du 2026-10-26) ; chaque partie reprend l'une des intentions d'origine, avec son statut d'origine.

## Besoin

Des écarts de documentation relevés pendant les chantiers : renvois au registre entier, citations restées en place, intitulés devenus faux, doc visiteur en retard. Chacun est petit ; ensemble, ils font un chantier d'entretien de la doc, chaque point vérifiable seul.

### les recettes et skills qui renvoient encore au registre entier (ex-« recettes-qui-lisent-le-registre-entier »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « réduire le contexte relu par chantier ».

Le chantier a fait pointer `AGENTS.md` et les recettes de clôture vers la
lecture ciblée (QUA-124 : `node .githooks/glossary.mjs --contract <ID>`,
`--contracts`, `--journal <chantier>`). D'autres textes citent encore
`docs/contracts.md` comme une lecture, ce qui invite un agent d'un autre outil
que Claude Code (sans garde de lecture, QUA-132) à le lire en entier.

### une annonce juste du oui à l'ouverture d'un détour qui cite le registre (ex-« annonce-oui-registre-detour »)

Statut d'origine : proposée le 2026-10-19 — limite du chantier « un contrat ajouté pendant un détour, sans arrêter la file » (journal du 2026-10-19, 0.6.6, 3 sur 4).

Pendant un détour, un ajout pur au registre des contrats passe désormais
sans le oui de l'humain (QUA-050, un détour pour une correction
intercalée). Mais à l'ouverture, `node .githooks/detour.mjs open … --files
docs/contracts.md` annonce encore « le oui de l'humain sera demandé » pour
le registre, alors qu'il ne le sera que si un contrat existant est modifié
ou retiré : l'annonce peut faire s'arrêter un sous-agent pour rien.

### la clôture signale aussi les citations d'une intention retirée (ex-« cloture-signale-intention-retiree »)

Statut d'origine : proposée le 2026-10-19 — écart relevé pendant le chantier « les branches fusionnées par squash reconnues » (journal du 2026-10-19, 0.6.6, 2 sur 4).

À la clôture, `node .githooks/close.mjs --check` signale les références à
la fiche qui deviendraient mortes (QUA-048, une clôture en un geste), mais
pas celles à l'intention d'origine qu'on retire quand elle est couverte.
Le 2026-10-19, deux anciennes entrées du journal citaient l'intention
retirée : `--check` disait « Rien ne ferait échouer la clôture », puis le
commit de clôture a été refusé par check-docs (chemin introuvable).

### retirer les citations de fiche restées dans le code non modifié (ex-« citations-de-fiche-heritees »)

Statut d'origine : proposée le 2026-10-18 — limite du chantier « une clôture allégée, sans encombrants » (journal du 2026-10-18, 0.6.5, 3 sur 4).

Le code cite le contrat qu'il sert, jamais une fiche de chantier (QUA-049).
La règle ne bloque que les fichiers modifiés : les citations du code
inchangé sont résumées en un avertissement. Neuf restent dans ce dépôt,
hors du cadrage du chantier qui a créé la règle.

### détecter un intitulé d'index ou un paragraphe de version devenu faux (ex-« intitule-d-index-devenu-faux »)

Statut d'origine : proposée le 2026-10-21 — limite non traitée de la clôture « la clôture vérifie la cohérence de la documentation » (journal du 2026-10-21).

La clôture refuse désormais une case contredisant le statut de sa fiche, mais
pas un intitulé d'index devenu faux (« 4 sur 5 » alors que la version a été
réduite à trois outils), ni le paragraphe d'une version de l'index qui ne suit
plus ses cases. Ces écarts sont de la prose : aucune règle sûre ne les détecte
aujourd'hui.

### ce que lit un visiteur reste juste sans dépendre de la mémoire de l'agent (ex-« doc-visiteur-juste »)

Statut d'origine : proposée le 2026-10-17 — limite de l'entretien courant du 2026-10-17 (README racine en retard, PR #120) ; élargie le même jour à la cérémonie de clôture (section « Toute clôture fait l'exercice »).

Le 2026-10-17, le README racine était faux sur trois points après la
clôture du chantier consommation (journal du 2026-10-16) : l'étape
CLOSING sans la consommation, la ligne `/drwil-usage` d'avant la mesure
automatique, et « Current status » qui présentait la 0.6.0 comme sortie
alors que la dernière release était la 0.5.1. Aucun contrôle ne l'a vu ;
c'est le demandeur qui a posé la question. Deux causes :

1. **Contenu en double** : le cycle d'un chantier (SCOPING → CLOSING),
   l'installation et les commandes (`init`, `verify`, `attest`,
   `doctor`, `uninstall`) sont écrits à la fois dans `README.md` et dans
   `packages/drwil/README.md`. La clôture a mis à jour l'un, pas l'autre,
   contre la règle « une information a une seule source » (`AGENTS.md`).
2. **Version annoncée non contrôlée** : rien ne compare ce que le README
   dit de la version (sortie ou à venir) au dernier tag publié.

**Toute clôture fait l'exercice (ajouté le 2026-10-17)** :

Même cause de fond : la clôture de l'entretien courant du 2026-10-17 a
sauté la boucle des intentions. L'agent avait tronqué la sortie de
`node .githooks/state.mjs move CLOSING` et n'a pas lu la règle ; une
limite relevée dans son compte rendu (« Current status » à réécrire à la
release) est restée dans le chat. Rien ne l'a rattrapé :

- QUA-036 (la clôture boucle les intentions) dit « à la clôture d'un
  chantier », sans dire si l'entretien courant en est ;
- son seul garde-fou avertit un commit qui supprime une fiche sans
  toucher son intention : la fiche d'entretien courant n'est jamais
  supprimée et n'a pas de champ `**Intention**`, il ne se déclenche
  jamais pour elle ;
- le rappel CLOSING parle de condenser ou supprimer la fiche, ce qui ne
  s'applique pas à l'entretien courant.

**Décision (demandeur, 2026-10-17)** : toute clôture est contrainte à
l'exercice, entretien courant compris — limites non traitées en
intentions, ce que lit l'utilisateur tenu à jour, consommation consignée.

### Notes reprises de `docs/intentions/notes.md`

- 2026-10-21 — Documenter dans le README la commande de note (node .githooks/note.mjs, QUA-071), absente du README alors que le changelog 0.6.9 l'annonce
- 2026-10-22 — Le passage BUILD → EVIDENCE sur l'entretien courant (fiche permanente) annonce sa suppression et liste ~40 faux avertissements « cite docs/projects/routine-maintenance.md, qui sera supprimée » : le signal de clôture devrait exempter la fiche permanente.

## Existant

Relevé dans chaque intention d'origine, à sa date ; non revérifié le 2026-10-26.

### les recettes et skills qui renvoient encore au registre entier (ex-« recettes-qui-lisent-le-registre-entier »)

**Existant (relevé le 2026-10-24)** :

- `AGENTS.md` (gabarit et dépôt), tableau « Si tu touches à… » : ligne « un
  défaut à corriger », colonne « Lis d'abord » = `docs/contracts.md`.
- Recettes du gabarit (`packages/drwil/templates/common/base/docs/recipes/`) :
  `docs/recipes/audit-risks-and-debt.md` (« Invariants »),
  `docs/recipes/modify-permissions.md`, `docs/recipes/corriger-un-defaut.md`,
  `docs/recipes/adopt-the-kit.md`, `docs/recipes/view-progress.md` (certaines
  mentions sont descriptives, pas des lectures).
- Skills Claude Code : `add-an-api-route`, `add-a-frontend-screen`,
  `adopt-the-kit`.

### une annonce juste du oui à l'ouverture d'un détour qui cite le registre (ex-« annonce-oui-registre-detour »)

**Existant (vérifié le 2026-10-19)** :

- `.githooks/detour.mjs` (`open`, texte `rulesAhead`) : liste les fichiers
  de `--files` reconnus par `rulesFiles`, registre compris, sans nuance.
- `.githooks/scope-gate.mjs` : juge le registre indexé contre HEAD
  (`contractsAddedOnly`) au moment du commit.

### la clôture signale aussi les citations d'une intention retirée (ex-« cloture-signale-intention-retiree »)

**Existant (vérifié le 2026-10-19)** :

- `.githooks/close.mjs` (`closingSignals`) : cherche les citations de la
  fiche active seulement.
- L'intention d'origine est connue (champ `**Intention**` de la fiche).

### retirer les citations de fiche restées dans le code non modifié (ex-« citations-de-fiche-heritees »)

**Existant (vérifié le 2026-10-18)** :

- `.github/scripts/ci-multi-os.mjs`, `.github/workflows/ia-first.yml`,
  `outils/installer-depot.mjs`, `outils/tester-tarball.mjs`,
  `packages/drwil/test/migration.test.mjs` : neuf commentaires citent une
  fiche, souvent déjà supprimée.
- check-docs les liste à chaque passage, en un avertissement non bloquant.

### détecter un intitulé d'index ou un paragraphe de version devenu faux (ex-« intitule-d-index-devenu-faux »)

**Existant (relevé le 2026-10-21)** :

- `.githooks/doc-coherence.mjs` ne lit que les cases, les statuts de fiche,
  les références mortes et les citations de fiche dans le code.
- Les cas rencontrés le 2026-10-19 sont restés à la vigilance de l'agent.

### ce que lit un visiteur reste juste sans dépendre de la mémoire de l'agent (ex-« doc-visiteur-juste »)

**Existant (vérifié le 2026-10-17)** :

- QUA-040 (drwil entretient la carte, le README et le changelog) : le
  contrôle `architecture-map` ne vérifie que la carte ; pour le README et
  le changelog, c'est une consigne de clôture.
- QUA-041 (la documentation lue par un nouvel utilisateur dit vrai) :
  satisfait par une attestation humaine, pas par un contrôle automatique.
- La release renomme la section « Unreleased » du changelog
  (`docs/recipes/create-a-release.md`), sans toucher au README.
- La table des skills n'existe que dans `README.md` (pas en double).

## Questions à trancher

### les recettes et skills qui renvoient encore au registre entier (ex-« recettes-qui-lisent-le-registre-entier »)

- Remplacer chaque mention qui est une lecture par la lecture ciblée, et
  garder les mentions descriptives ?
- Faut-il un contrôle (doc-coherence) qui refuse une consigne de lecture du
  registre entier dans une recette livrée ?

### une annonce juste du oui à l'ouverture d'un détour qui cite le registre (ex-« annonce-oui-registre-detour »)

- [décision] Nuancer l'annonce pour le registre (« seulement si un contrat
  existant est modifié ou retiré »), ou retirer le registre de l'annonce ?

### la clôture signale aussi les citations d'une intention retirée (ex-« cloture-signale-intention-retiree »)

- [décision] Signaler aussi les citations de l'intention d'origine (« si
  vous la retirez, ces lignes deviendront mortes »), ou laisser check-docs
  les attraper au commit ?

### retirer les citations de fiche restées dans le code non modifié (ex-« citations-de-fiche-heritees »)

- [décision] Les corriger d'un coup (entretien courant, cadrage de ces cinq
  fichiers) ou au fil des chantiers qui touchent chaque fichier ?

### détecter un intitulé d'index ou un paragraphe de version devenu faux (ex-« intitule-d-index-devenu-faux »)

- Un format structuré (compteur ou liste de cases rattachées à une version) rendrait-il l'écart détectable sans heuristique ?
- Un avertissement à la clôture, ou un contrôle bloquant ?

### ce que lit un visiteur reste juste sans dépendre de la mémoire de l'agent (ex-« doc-visiteur-juste »)

- [décision] Source unique : le détail (cycle, installation, commandes)
  vit dans un seul des deux README, l'autre y renvoie — lequel, sachant
  que `packages/drwil/README.md` est la page affichée par npm une fois le
  paquet publié ? Ou bien un contrôle qui compare les passages communs ?
- [décision] Version annoncée : un contrôle qui compare la version citée
  par le README (et la section « Current status ») au dernier tag, ou une
  étape de la recette de release qui la réécrit ?
- [décision] Livrable ou dépôt : ces contrôles servent-ils aussi chez un
  projet client (son README et ses tags), ou seulement à ce dépôt ?
- [décision] Comment contraindre la clôture, sans dépendre de la
  lecture du rappel : par exemple, refuser le retour en SCOPING (ou
  avertir) tant que le commit de clôture ne déclare pas ses limites —
  une intention citée, ou « Limites : aucune » explicite (dans « Limites
  connues » du journal pour un chantier, dans la ligne du journal de la
  fiche pour l'entretien courant) ? Refus ou avertissement ?
- [décision] Le rappel CLOSING distingue-t-il l'entretien courant (pas de
  condensation ni de suppression, mais le reste de l'exercice) ?
