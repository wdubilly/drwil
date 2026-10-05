# drwil

**Quand une IA (ou un humain) code sans cadre**, rien n'empêche un oubli
de contexte entre deux sessions, une règle de sécurité non respectée, un
« c'est corrigé » annoncé sans preuve, ou un secret qui fuite dans un
commit. drwil installe dans un projet un **cadre vérifié
automatiquement** : les règles importantes sont écrites une seule fois,
et un contrôle Git les fait respecter à chaque commit — que ce soit vous
ou une IA (Claude, Copilot, Cursor, Codex, Gemini) qui écrive le code.

Concrètement, le kit ajoute à un projet :
- un **point d'entrée unique** que toute IA lit en premier (`AGENTS.md`) ;
- un **registre des règles qui comptent** (`docs/contrats.md`), chacune
  avec sa preuve ;
- des **contrôles Git** (`.githooks/`) qui bloquent un commit qui viole
  une règle — en local et en CI.

Ce dépôt est le code source du kit, **appliqué à lui-même** (dogfooding) :
il suit ses propres règles.

## Pour qui

Le bénéfice est concret si :
- plusieurs outils IA cohabitent sur le même projet (Claude, Cursor,
  Copilot…) et leurs règles divergent faute d'un point d'entrée commun ;
- une tâche IA est régulièrement interrompue et reprise par quelqu'un
  d'autre (agent ou humain) sans tout relire ;
- un incident a déjà eu lieu (secret qui fuite, règle de sécurité
  contournée, « corrigé » annoncé sans preuve) et vous voulez que ça ne
  se reproduise pas en silence.

Même en solo, un projet qui s'étale sur plusieurs sessions en profite :
on oublie aussi ses propres décisions et contraintes au bout de quelques
semaines, pas seulement en équipe.

## Pourquoi ça réduit le gaspillage IA

Pas de chiffre annoncé ici (rien n'est mesuré à ce jour, voir
`docs/recettes/suivre-consommation-par-lot.md`), mais un raisonnement
mécanique concret :

1. **Contexte chargé à la demande** : `AGENTS.md` de couche (pas tout le
   dépôt) + chargement progressif (section « Charger le contexte »
   d'`AGENTS.md`) — moins de tokens consommés pour comprendre avant
   d'agir.
2. **Cadrage avant code** : une demande ambiguë devient une fiche de
   décision avant d'écrire — évite qu'un agent parte dans une mauvaise
   direction et qu'il faille tout refaire (le vrai gaspillage de
   tokens).
3. **Preuve mécanique plutôt que relecture** : un contrat vérifié par un
   contrôle évite les allers-retours de validation manuelle (« est-ce
   bon ? » répété).

> **Assistants de code** : commencer par `AGENTS.md` (conduite, contrats,
> chargement du contexte).

## Ce que drwil résout, et comment

| Problème concret | Mécanisme drwil | Contrat / preuve |
|---|---|---|
| Chaque outil IA (Claude, Cursor, Copilot…) a ses propres règles, qui divergent faute d'un point d'entrée commun | `AGENTS.md` unique à la racine, importé par un fichier d'import propre à chaque outil (`CLAUDE.md` ici ; équivalents Copilot/Cursor/Codex/Gemini livrés par le gabarit selon l'outil choisi à l'installation) — une seule source, jamais recopiée | — |
| Une doc cite un chemin ou un ID de contrat qui n'existe plus (ou plus) | Un hook refuse le commit si la doc cite un chemin/ID inexistant | QUA-011 |
| Un agent affirme « c'est corrigé » sans avoir relancé le contrôle | Convention explicite (`AGENTS.md`) : preuve avant annonce — relancer et lire la sortie | — |
| Un secret (clé, mot de passe, `.env`) atterrit dans un commit | Détection de secrets (gitleaks) au commit et en CI, sur les fichiers indexés et l'historique | SEC-007 |
| Une dépendance a une faille connue, personne ne s'en aperçoit | Audit de dépendances déclaré dans les contrôles du projet | SEC-006 |
| Un contrôle CI a été silencieusement retiré ou ne couvre plus les bons chemins | Un hook vérifie que chaque contrôle attendu tourne réellement en CI — un contrôle non exécuté n'est pas considéré passé | QUA-013 |
| Un chantier repris à froid (par un autre agent, ou plus tard) oblige à tout relire pour comprendre où ça en est | Chaque fiche de `docs/projets/` a un Statut daté et une section Reprise ; chaque case de l'index porte qui doit trancher (`[IA]`/`[humain]`/`[décision]`) | QUA-015 |
| Du code est ajouté sans lien avec aucun chantier documenté | Tout fichier de code indexé doit être couvert par le bloc de cadrage d'une fiche de `docs/projets/` | QUA-016 |
| Un commit ou push direct sur `master`/`main` contourne la revue | Bloqué après le tout premier commit (bootstrap toléré) : le travail passe par une branche + pull/merge request | QUA-017 |
| Sur ce dépôt précisément : confondre « ce projet » et « le gabarit qu'il distribue » | Un rappel explicite force à demander lequel des deux est visé avant d'agir en cas de doute | QUA-018 |
| Pas de protection de branche possible (dépôt privé, plan gratuit) : un merge direct peut casser `master` sans que personne ne s'en rende compte | Une issue GitHub/GitLab est ouverte automatiquement si la CI casse sur la branche principale (pas de doublon si déjà ouverte) | — (recette dédiée) |

## Comment ça cadre l'IA

- **Contexte chargé à la demande** : `AGENTS.md` de couche (pas tout le
  dépôt), chargement progressif documenté — une IA comprend les règles
  qui s'appliquent à ce qu'elle touche sans tout ingérer à chaque fois.
- **Cadrage avant code** : une demande ambiguë devient une fiche de
  décision (`docs/projets/`) avant d'écrire du code — les points à
  trancher sont posés à l'humain, pas décidés à sa place.
- **Preuve mécanique plutôt que relecture** : un contrat vérifié par un
  contrôle (hook + CI) évite les allers-retours de validation manuelle.
- **Multi-outils sans dérive** : Claude Code, GitHub Copilot, Cursor,
  Codex et Gemini lisent tous le même `AGENTS.md` via leur fichier
  d'import respectif — une règle changée une fois vaut pour tous les
  outils.
- **Rien n'est jamais écrasé** : `apply()` (installation sur un projet
  existant) détecte un fichier déjà présent qui a dérivé du gabarit et le
  signale au lieu de le réécrire ; un manifeste (chemin + empreinte)
  trace ce que le kit a installé.

## Comment ça cadre l'équipe (humains et IA mélangés)

- **Branche + revue systématiques** (QUA-017) : personne (humain ou IA)
  ne pousse directement sur la branche principale après le tout premier
  commit — gabarits de pull/merge request fournis selon la CI choisie
  (GitHub ou GitLab).
- **Historique des décisions traçable** : `docs/contrats.md` (les règles
  qui comptent, avec leur preuve) et `docs/projets/` (chantiers en cours
  et clos, avec leurs décisions datées) remplacent les décisions orales
  perdues dans un chat.
- **Alerte, pas de blocage a priori** : sans protection de branche
  possible (dépôt privé gratuit), la CI cassée sur la branche principale
  ouvre une issue automatiquement plutôt que de compter sur quelqu'un qui
  surveille.
- **Suivi de consommation et d'avancement** : un tableau de bord
  optionnel agrège les chantiers, contrats et coûts (tokens) par lot,
  pour répondre vite à « où en est-on » et « qu'est-ce que ça a coûté ».

## Modules optionnels (jamais installés par défaut)

| Module | Ce qu'il fait | Activation |
|---|---|---|
| `tableau-de-bord` | Page HTML qui agrège chantiers, contrats et audits du dépôt | copier le script, voir son README |
| `front-quality` | Contrôle de contraste et de couleurs (RGAA/WCAG) pour un front | idem |
| `creer-une-release` | Tag Git + note de release GitHub, calcul de version best-effort (Conventional Commits) | `docs/recettes/creer-une-release.md` — toujours manuel, sur demande explicite, jamais automatique |

## En bref

- `packages/drwil/` : le paquet (CLI `init`/`apply`, templates FR/EN).
- `init` scaffolde un projet neuf ; `apply` installe le kit sur un projet
  existant sans jamais rien écraser.
- Stacks détectées ou choisies explicitement (`backend`, `frontend`,
  `generic`) ; outils IA (`claude`, `codex`, `cursor`, `gemini`,
  `copilot`) et CI (`github`, `gitlab`, ou aucune) au choix à
  l'installation.
- Livré en français et en anglais, contenu équivalent dans les deux
  langues (vérifié par test).
- Les contrôles (cohérence de la doc, détection de secrets, couverture des
  contrôles par la CI…) s'exécutent au commit (`.githooks/pre-commit`) et
  en CI.
- Testé vert en CI sur Linux, macOS et Windows (matrice `kit-tests` de
  `.github/workflows/`).
- Pas encore publié sur npm : s'utilise aujourd'hui depuis un clone de ce
  dépôt, ou via un tarball `npm pack` (voir ci-dessous).

## Démarrer

```bash
cd packages/drwil
npm install
npm run build
npm test                 # suite de tests du paquet drwil

# tester le CLI sur un dossier vide
node bin/drwil.js init --name "MonProjet" --layers backend,frontend
```

Activer les hooks de vérification, une fois par clone :
```bash
git config core.hooksPath .githooks
```

## Donner le paquet à tester sans publier sur npm

```bash
cd packages/drwil
npm pack                 # rebuild automatique (script "prepack"), produit drwil-0.0.1.tgz
```

Le fichier `.tgz` s'installe comme n'importe quel paquet npm, en local ou
chez quelqu'un d'autre :
```bash
npm install /chemin/vers/drwil-0.0.1.tgz
npx drwil init --name "MonProjet"
```
Fonctionne aussi sans installation préalable : `npx /chemin/vers/drwil-0.0.1.tgz init ...`.

## Documentation

| Sujet | Document |
|---|---|
| Cycle de vie d'un chantier, cadrage, reprise à froid | `docs/ia-first.md` |
| Structure du dépôt | `docs/architecture.md` |
| Règles vérifiées (contrats du socle) | `docs/contrats.md` |
| Contrats optionnels à adopter sur un projet | `docs/catalogue-contrats.md` |
| Procédures réutilisables (adopter le kit, auditer, etc.) | `docs/recettes/` |
| Chantiers en attente | `docs/projets/en-attente.md` |
| Voir où en est le projet | `docs/recettes/visualiser-avancement.md` |
| Auditer risques et dette technique | `docs/recettes/auditer-risques-et-dette.md` |
| Suivre le coût d'un chantier | `docs/recettes/suivre-consommation-par-lot.md` |
| Explorer la valeur produit | `docs/recettes/decouvrir-valeur-produit.md` |
| Travailler avec des branches et des merge/pull requests | `docs/recettes/travailler-en-branche.md` |
