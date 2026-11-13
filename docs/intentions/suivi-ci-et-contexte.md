# Intention : suivre la durée de la CI et le contexte relu, et trancher leurs calibrages

**Statut** : en partie reprise en 0.11.2 le 2026-11-11 par `docs/projects/temps-des-controles-journalise.md` (journal des passes, durée de la CI, relevé hooks inchangés) et `docs/projects/doublon-des-tests-des-hooks-en-ci.md` (doublon `checks-self-test`, QUA-004, budget Windows) ; le reste (cache lu, gardes de lecture, découpage du registre, Node 24, gain pour les projets adoptés, `[ia-first-warning]`) reste ouvert sans version ; proposée le 2026-10-25 — regroupement de 10 intentions et 1 note(s) lors du ménage du 2026-10-25 ; chaque partie reprend l'une d'elles, avec son statut d'origine.

**Revu le 2026-11-13** : condensée au ménage. Les parties faites ou reprises par une fiche cadrée sont résumées avec leur renvoi ; les parties ouvertes gardent leur besoin, leur existant daté et leurs questions. Texte intégral d'avant le ménage : `git log --follow -- docs/intentions/suivi-ci-et-contexte.md`. Revérifié le 2026-11-13 : la CI du dépôt joue toujours les tests des hooks sur Node 22 seulement (`kit-tests` sur Node 24) ; `docs/contracts.md` pèse 526 ko et `docs/projects/journal.md` 376 ko (181 et 191 ko le 2026-10-24).

## Besoin

Les chantiers « accélérer la CI sans perte de qualité » et « réduire le contexte relu par chantier » (journal du 2026-10-24) ont laissé des mesures à relever et des questions de calibrage. Elles se tranchent ensemble : savoir si la CI et le contexte relu tiennent leurs objectifs, sans ajouter de contrat attesté, avant de retoucher la CI ou de découper le registre.

### Déjà fait, ou repris par une fiche cadrée (0.11.2)

- **suivre la durée de la CI comme un indicateur, pas comme un contrat attesté** (ex-« objectifs-de-duree-ci-en-indicateur ») : fait le 2026-10-25 (relevé par chantier au journal, QUA-122 gardé comme preuve historique dans `docs/mesures-ci-reference.md`) et le 2026-10-30 (tendance et seuil d'alerte non bloquant, QUA-198) ; durée par contrôle en CI, reprise des verdicts et saut du rejeu livrés le 2026-11-08 (QUA-136, QUA-113, QUA-250, QUA-033). Reste — réévaluer le seuil au fil des relevés, relever les durées en CI — repris par `docs/projects/temps-des-controles-journalise.md`.
- **relever la durée du job `checks` quand les hooks sont inchangés** (ex-« releve-duree-checks-hooks-inchanges ») : repris par `docs/projects/temps-des-controles-journalise.md`.
- **les chantiers vont-ils plus vite ? un journal des passes locales** (demande du 2026-10-26 ; constat chiffré : aucun gain de durée visible entre le 16 et le 26 octobre, aucune preuve `verify --evidence` n'avait repris un verdict de `run-checks`) : repris par `docs/projects/temps-des-controles-journalise.md` ; les rejeux d'une clôture par `docs/projects/preuves-fiables-rejeux-mesures.md`.
- **`checks-self-test` double-t-il `couverture-hooks` ?** (ex-« checks-self-test-contre-couverture-hooks »), **un échec non expliqué de QUA-004 au pre-push** (ex-« alea-couverture-qua-004-au-pre-push »), **un budget de temps des contrôles calibré pour les machines Windows de la CI** (ex-« budget-temps-windows ») et **documenter l'avertissement émis par un contrôle (`[ia-first-warning]`) dans son contrat** (ex-« tests-de-timing-instables ») : repris par `docs/projects/doublon-des-tests-des-hooks-en-ci.md`, qui relève le budget Windows déjà traité (le dépassement avertit sans bloquer) et décide de ne pas compléter le texte de QUA-127.
- **Durée de `drwil verify` et de chaque contrôle** (notes du 2026-10-25) : fait — durée par contrôle (QUA-136), `verify` en parallèle (QUA-139), reprise d'un verdict de `run-checks` sur un arbre identique (QUA-140) puis contrôle par contrôle (QUA-141), reprise au pre-push (QUA-152), `verify --failed` (QUA-159).

### relever le cache lu moyen par requête après la réduction du contexte (ex-« releve-cache-lu-par-requete »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « réduire le contexte relu par chantier » (l'indicateur sorti des critères d'acceptation devient un relevé, sans seuil).

Savoir si la lecture ciblée (QUA-124), les sorties courtes (QUA-126), le sous-agent de contrôles (QUA-129) et la lecture forcée (QUA-132) baissent vraiment le contexte relu à chaque requête. En attente du demandeur depuis le 2026-10-30 : choisir deux paires de chantiers comparables. Paires proposées d'après `usage.jsonl` : A, de 80 à 115 requêtes, `premier-commit-avant-adoption` (115, 145 k) et `barriere-commit-de-fusion` (99, 105 k), contre `adopter-seuil-couverture` (114, 141 k) et `couverture-du-code-modifie` (83, 106 k) ; B, de 50 à 60 requêtes, `verify-reprise-par-controle` (52, 105 k) et `stab-squash` (52, 92 k), contre `e2e-et-attestation-precises` (52, 74 k) et `registre-vise-les-sections-d-ia-first` (60, 70 k). Le tableau de bord montre déjà la tendance (QUA-198).

### jouer aussi les tests de `.githooks/` sur Node 24 (ex-« tests-des-hooks-sur-node-24 »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « accélérer la CI sans perte de qualité ».

Le job `checks` joue la suite une seule fois, sur Node 22 (QUA-123) : les tests de `.githooks/*.test.mjs` ne tournent plus sur Node 24. `kit-tests` joue sur Node 24 la suite du paquet (qui lance les hooks dans des projets temporaires), pas ces tests-là.

### le gain de CI atteint-il les projets adoptés ? (ex-« ci-livree-aux-projets-non-mis-a-jour »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « accélérer la CI sans perte de qualité ».

Les CI du gabarit GitHub et GitLab portent les nouvelles tentatives et le cache de gitleaks, et le gabarit des hooks la reprise des verdicts (2026-11-08) ; l'artefact `arbre-prouve` n'existe que côté GitHub. Mais un projet existant ne déclare ni `build`, ni `parallel`, ni `needsBuild` dans `.drwil/ia-first.json` : sans mise à jour de sa configuration, il garde ses durées.

### éprouver les gardes de lecture et le sous-agent dans une vraie session Claude Code (ex-« gardes-de-lecture-en-session-reelle »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « réduire le contexte relu par chantier ».

QUA-132 (registre et journal jamais lus en entier) et QUA-129/QUA-130 (sous-agent `drwil-checks`) sont prouvés par des tests qui rejouent les hooks sur des entrées simulées ; aucune vraie session Claude Code n'a été rejouée.

### découper le registre des contrats et le journal (ex-« decoupage-registre-et-journal »)

Statut d'origine : proposée le 2026-10-24 — hors périmètre décidé par le demandeur, à reprendre si la lecture ciblée ne suffit pas.

Les deux fichiers grossissent à chaque chantier (voir la revue du 2026-11-13 : ils ont doublé et triplé en trois semaines). La lecture ciblée (QUA-124) et la lecture forcée (QUA-132) évitent de les lire en entier, mais une lecture par plage reste possible, et les contrôles qui les lisent restent liés à un seul fichier.

### Notes reprises de `docs/intentions/notes.md`

- 2026-10-24 — Accélérer la CI, si elle reste trop lente : suite unique avec verdict par contrat via un reporter (décision humaine, QUA-033), jobs de CI découpés via `ciJob` (renomment les checks exigés par le ruleset), cache de compilation.
- 2026-10-23 — Réduire la consommation par chantier (`barriere-commit-de-fusion` : 1,6 M pondérés, 64 % de contexte relu, 85 min pour un petit correctif) : sorties courtes en mode agent (fait depuis, QUA-126) ; vérifier au cadrage que chaque critère sera lu par `verify` ; contrôle rapide du seul fichier touché avant `run-checks` ; `.githooks/consumption.mjs` attribue par nom de branche, si bien qu'une branche de cadrage nommée d'après une fiche gonfle son chiffre ; mesurer le temps par étape (dev, contrôles, clôture, attente de CI).
- 2026-10-26 — `verify` en FAIL sans contrat en échec : contrat MANUAL (QUA-013, QUA-048) ou arbre modifié (`dirtyWorktree`) ; vu sur au moins 4 des 17 FAIL des 25 et 26 octobre.

## Existant

Relevé dans chaque intention d'origine, à sa date ; revérifié le 2026-11-13 pour Node 24 et la taille des fichiers seulement.

- **Cache lu** (2026-10-24) : `node .githooks/consumption.mjs --recorded` ; référence retenue par le demandeur ≈ 170 k de cache lu par requête.
- **Node 24** (2026-11-13) : `.github/workflows/ia-first.yml`, `checks` sur Node 22, `kit-tests` sur Node 24, suite du paquet seule.
- **Projets adoptés** (2026-10-24) : moteur des hooks à jour dans le gabarit ; `drwil update` et `doctor` ne proposent pas `parallel` ni `build`.
- **Gardes de lecture** (2026-10-24) : le refus de `cat` est jugé sur le texte de la commande (`docs/intentions/contournements-restants.md`) ; faux positif constaté : `cat >> docs/projects/journal.md <<EOF` (une écriture) refusé comme une lecture ; le banc des agents (QUA-060) sait lancer une vraie session.
- **Registre et journal** (2026-10-24) : un fichier chacun ; le catalogue, `check-docs`, `.githooks/glossary.mjs`, `.githooks/close.mjs` et `.githooks/doc-coherence.mjs` les lisent.

## Questions à trancher

- [décision] Découper ce regroupement en lots, chacun vérifiable seul, et choisir le premier.
- **Cache lu** : relever avec `node .githooks/consumption.mjs --recorded` le cache lu moyen par requête sur les paires choisies, le comparer aux ≈ 170 k, le consigner au journal, puis retirer cette partie. [décision] Quelles paires comptent comme comparables ?
- **Node 24** : [décision] accepter ce recul (les hooks sont exercés sur Node 24 par la suite du paquet) ou ajouter `node --test .githooks/*.test.mjs` à `kit-tests` (élargit le test de structure de `ci-multi-os`) ?
- **Projets adoptés** : [décision] `drwil update` / `doctor` propose-t-il `parallel` et `build` aux projets existants ? Le workflow livré évite-t-il le doublon push / PR ?
- **Gardes de lecture** : ajouter au banc un scénario « lire le registre en entier » (refus attendu, renvoi vers `.githooks/glossary.mjs`) et un passage par le sous-agent ? Laisser passer `cat` quand le fichier gardé n'est que la cible d'une redirection (`>`, `>>`) ?
- **Registre et journal** : découper seulement si le relevé du cache lu montre que la lecture ciblée ne suffit pas ? Forme : un fichier par contrat, par année de journal, ou archive des entrées anciennes ? Change le format lu par les contrôles et le catalogue : migration pour les projets adoptés.
