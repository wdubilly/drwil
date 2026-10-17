# Intention : un identifiant sans libellé est rattrapé avant d'arriver à l'humain

**Statut** : proposée le 2026-10-17 — constaté par le demandeur (« la
mécanique imposant de décrire le contrat et pas uniquement son ID ne
fonctionne pas très bien »), à traiter rapidement (0.6.3).

## Besoin

QUA-039 (un identifiant cité à l'humain vient avec ce qu'il désigne) est
respecté par les sorties de drwil, mais pas par les réponses de l'agent.
Constaté dans la séance du 2026-10-17 :

1. **Le hook regarde ce que l'agent lit, pas ce qu'il écrit.**
   `.claude/hooks/id-glossary.mjs` se déclenche après les commandes et
   lectures (PostToolUse) et rappelle les libellés trouvés dans leur
   sortie ; rien ne relit la réponse avant qu'elle arrive à l'humain.
   L'agent a écrit « OPT-6 à OPT-8 », « OPT-1 d'abord, puis OPT-3, OPT-4,
   OPT-5 », « scénario S6 » sans dire ce qu'ils désignent.
2. **Le glossaire ne connaît qu'une partie des identifiants.**
   `.githooks/glossary.mjs` lit les contrats du registre, les lignes du
   catalogue et les lots et points de la fiche active : ni les
   opportunités de `docs/decouverte-valeur.md`, ni des repères comme les
   scénarios d'un rapport ; en SCOPING, sans fiche active, aucun lot ni
   point.
3. **Le rappel fait trop de bruit pour être lu.** Sur une longue sortie
   (commit, `run-checks`), il injecte une quinzaine de contrats dont la
   réponse ne parle pas ; répété, il ne porte plus.

## Existant (vérifié le 2026-10-17)

- QUA-039 dans `docs/contracts.md` : source unique `.githooks/glossary.mjs`
  (commande `node .githooks/glossary.mjs "<texte>"`), sorties de drwil
  libellées, règle dans `AGENTS.md` et les instructions Copilot et
  Cursor, hook Claude Code « sans jamais bloquer ».
- `.claude/settings.json` : hooks `SessionStart`, `UserPromptSubmit`,
  `PreToolUse`, `PostToolUse` ; pas de hook de fin de réponse (`Stop`).
- `init` rafraîchit `.claude/hooks/` mais pas `.claude/settings.json`
  (`KIT_MECHANICS`, `packages/drwil/src/config.ts`) : déclarer un nouveau
  hook n'atteint un projet installé que par `drwil resolve-drift`.
- Intention voisine : `docs/intentions/glossaire-autres-agents.md` (même
  rappel chez les autres agents).

## Piste proposée par l'agent

- **Contrôler la réponse** : un hook de fin de réponse (Claude Code :
  `Stop`, à vérifier — lecture du dernier message, renvoi à l'agent avec
  la raison) repère un identifiant connu cité sans libellé à côté et
  demande à l'agent de corriger avant que l'humain lise. Les autres
  agents gardent la consigne et la commande.
- **Étendre le glossaire** aux identifiants déclarés par les documents de
  travail (opportunités de la découverte de valeur, repères déclarés dans
  une intention).
- **Réduire le bruit** du rappel, ou le retirer si le contrôle de fin de
  réponse le rend inutile.

## Questions à trancher

- [décision] Contrôle de fin de réponse : bloquant (l'agent doit
  corriger, une seule fois pour ne pas boucler) ou simple avertissement ?
- [décision] « Libellé à côté » : comment le juger sans faux positifs (le
  libellé exact du glossaire, une parenthèse ou un tiret qui suit l'ID,
  une mention déjà libellée plus haut dans la même réponse) ?
- [décision] Quelles sources ajouter au glossaire : opportunités de
  `docs/decouverte-valeur.md`, repères déclarés dans les intentions,
  autres ?
- [décision] Le rappel après chaque outil : garder, réduire aux
  identifiants nouveaux, ou retirer ?
- [décision] Projets déjà installés : `resolve-drift` suffit-il pour
  déclarer le nouveau hook dans `.claude/settings.json`, ou la mise à
  jour doit-elle le couvrir ? (Tranché le 2026-10-17 : la mise à jour le
  rafraîchit s'il est inchangé, journal du 2026-10-17.)
