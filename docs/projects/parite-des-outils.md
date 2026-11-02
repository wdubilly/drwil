# Projet : la même gouvernance et le même cycle sous Claude Code, Copilot CLI, Gemini CLI et Codex

**Statut** : cadré le 2026-11-02, en tête de pile de la 0.11.0 (décidé le même jour) (demande du demandeur : « faire fonctionner copilot + claude + gemini + codex de la même manière »), décisions tranchées le même jour.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - docs/projects/parite-des-outils.md
  - docs/projects/pending.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Seul Claude Code a le cycle complet : sondage de lancement lu par un hook, file de chantiers menée par
sous-agents, blocage avant écriture, rappel d'état. Constaté le 2026-11-02 : sous Copilot CLI, le sondage ne
prend qu'**une fiche** (choix multiple revenu vide, `docs/intentions/notes.md`), donc pas de file ; Codex n'a
jamais été essayé (`docs/intentions/compat-codex.md`) ; Gemini n'a ni skills trouvés ni sous-agents vérifiés
(`docs/intentions/compatibilite-des-outils.md`). Le demandeur veut un même parcours, quel que soit l'agent.

## Critères d'acceptation

- Un tableau de parité, outil par outil (Claude Code, Copilot CLI, Gemini CLI, Codex), dit pour chacun : sondage
  de lancement, choix de plusieurs fiches (file), sous-agent par chantier, blocage avant écriture, rappel d'état ;
  chaque case est « tenu », « contourné par … » ou « impossible », avec date et version d'essai, jamais devinée
  (rattaché à QUA-063, matrice de compatibilité) — contrat à créer
- Une file de plusieurs fiches se lance d'un seul geste humain sous chaque outil qui la permet ; sous un outil
  qui ne la permet pas, le contournement est une file lue par l'état (`state.mjs queue`), sans cocher plusieurs
  cases — contrat à créer
- Le contournement ne laisse jamais l'agent décider du lancement : l'humain répond, un outil lit (même
  invariant que le sondage actuel) — contrat à créer
- Le résultat par outil est prouvé par le banc `outils/banc-agents.mjs` ; l'attestation de la colonne
  « Attested by the human » reste un geste humain — [humain]

## 2. Hors périmètre

- Cursor (`docs/intentions/compat-cursor.md`) : hors des quatre outils demandés.
- La consommation de tokens par outil.

## 3. Contraintes

- Livrable : les changements vont dans le gabarit (`packages/drwil/templates/`), jamais dans une copie installée.
- QUA-013 : un essai non fait est « not tested », jamais « tenu ».
- Un seul jeu de scripts de hooks pour tous les outils (état actuel) : garder cette règle.
- Les lots partagent `.githooks/state.mjs` et ses tests : un lot à la fois.

## 4. Décisions

Tranchées par le demandeur le 2026-11-02 :

- File par commande dans tous les cas : on n'attend pas la cause du choix multiple vide sous Copilot CLI.
- Outil sans sous-agent exploitable : proposer à l'humain une nouvelle conversation entre deux chantiers.
- Tous les outils ensemble, un lot par capacité (et non un lot par outil).
- Codex : le demandeur l'installe avant le lot 1.

## 5. Points à trancher

- [humain] Installer Codex sur le poste et s'y connecter, avant le lot 1.

## 6. Increments

- **Lot 1 — sondes** [humain] : pour les quatre outils, vérifier sondage, sous-agents dans le dossier du dépôt,
  hooks lancés. Sortie : le tableau de parité rempli avec dates et versions.
- **Lot 2 — file par commande** [IA] : `state.mjs queue` utilisable sous chaque outil, sans choix multiple dans
  le sondage. Sortie : une file de deux fiches lancée sous un outil à sondage unique.
- **Lot 3 — sous-agent ou nouvelle conversation** [IA] : consigne de sous-agent là où l'outil le permet,
  sinon proposition d'une nouvelle conversation entre deux chantiers ; banc et matrice à jour.

## 7. Reprise

- **Dernier état** (2026-11-02) : décisions tranchées, aucun code.
- **Travail non commité** : cette fiche.
- **Prochaine étape** : [décision] installer Codex ([humain]), puis lancer par `/drwil-start`.
