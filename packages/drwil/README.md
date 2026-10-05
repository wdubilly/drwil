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
- des **contrôles Git** (hooks) qui bloquent un commit qui viole une
  règle — en local et en CI.

## Installer

Les deux commandes s'exécutent **dans le dossier courant** (`cd` dans le
projet avant de lancer la commande) ; aucune ne crée de nouveau dossier.
Le choix entre les deux dépend de l'état du projet.

### `init` — projet tout neuf, ou dossier vide

```bash
mkdir MonProjet && cd MonProjet
npx drwil init --name "MonProjet"
```

Scaffolde la structure complète du kit dans le dossier courant
(`AGENTS.md`, `docs/contrats.md`, hooks Git activés). Un deuxième
`init` ne rafraîchit que `.githooks/` par défaut (les docs déjà
écrites ne sont pas touchées) ; `--force` écrase tout, y compris les
docs de projet ajoutées depuis — à réserver à un rattrapage volontaire.

### `apply` — projet déjà existant

```bash
cd MonProjetExistant
npx drwil apply
```

Pour un dépôt qui a déjà du code, un historique Git et des dépendances
en place. `apply` détecte la stack présente (sous-dossiers
backend/frontend, outils IA déjà configurés) et installe le kit
par-dessus **sans jamais rien écraser** : un fichier déjà présent est
laissé tel quel, et signalé s'il a dérivé du gabarit depuis une
installation précédente. C'est la commande à utiliser pour adopter
drwil sur un projet en cours.

Options principales (communes aux deux commandes) : `--lang fr|en`,
`--layers backend,frontend` (détecté sinon), `--tools
claude,copilot,cursor,codex,gemini`, `--ci github|gitlab|none`. Voir
`npx drwil init --help` ou `npx drwil apply --help`.

## Ce que ça résout, et comment

| Problème concret | Mécanisme drwil |
|---|---|
| Chaque outil IA a ses propres règles, qui divergent faute d'un point d'entrée commun | `AGENTS.md` unique, importé par le fichier propre à chaque outil installé |
| Une doc cite un chemin ou un ID de contrat qui n'existe plus | Un hook refuse le commit si la doc cite un chemin/ID inexistant |
| Un secret (clé, mot de passe, `.env`) atterrit dans un commit | Détection de secrets au commit et en CI |
| Un contrôle CI a été silencieusement retiré | Un hook vérifie que chaque contrôle attendu tourne réellement en CI |
| Un chantier repris à froid oblige à tout relire pour comprendre où ça en est | Chaque fiche de chantier a un Statut daté et une section Reprise |
| Du code est ajouté sans lien avec aucun chantier documenté | Tout fichier de code doit être couvert par un bloc de cadrage |
| Un commit ou push direct sur la branche principale contourne la revue | Bloqué après le tout premier commit : le travail passe par une branche + pull/merge request |

## Comment ça cadre l'IA

- **Contexte chargé à la demande** : `AGENTS.md` de couche, pas tout le
  dépôt — une IA comprend les règles qui s'appliquent sans tout ingérer.
- **Cadrage avant code** : une demande ambiguë devient une fiche de
  décision avant d'écrire — les points à trancher sont posés à l'humain.
- **Preuve mécanique plutôt que relecture** : un contrat vérifié par un
  contrôle évite les allers-retours de validation manuelle.
- **Multi-outils sans dérive** : Claude Code, GitHub Copilot, Cursor,
  Codex et Gemini lisent tous le même `AGENTS.md`.

## Comment ça cadre l'équipe

- **Branche + revue systématiques** : personne ne pousse directement sur
  la branche principale après le tout premier commit.
- **Historique des décisions traçable** : le registre de contrats et les
  fiches de chantier remplacent les décisions orales perdues dans un
  chat.
- **Alerte CI cassée** : une issue est ouverte automatiquement si la CI
  casse sur la branche principale (utile sans protection de branche).

## Modules optionnels (jamais installés par défaut)

- **tableau-de-bord** : page HTML qui agrège chantiers, contrats et
  audits.
- **front-quality** : contrôle de contraste/couleurs (RGAA/WCAG) pour un
  front.
- **créer une release** : tag Git + note de release GitHub, calcul de
  version best-effort — toujours manuel, sur demande explicite.

## En savoir plus

Code source, documentation complète (recettes, catalogue de contrats,
architecture) : <https://github.com/wdubilly/drwil>.
