# Intention : tout faire depuis `drwil serve`, comme dans le chat

**Statut** : proposée le 2026-11-22, demande du demandeur. Priorité proposée : P1. Reprend les deux notes du 2026-11-13
sur la suite de `drwil serve` (sondages cliquables derrière un jeton, chat web intégré), retirées de
`docs/intentions/notes.md`.

## Besoin

Formulé par le demandeur le 2026-11-22 : « l'idéal serait que je puisse tout faire avec [drwil serve] », « je veux tout
comme dans le chat ». Depuis la vue, au navigateur comme au téléphone (par Tailscale) :

- converser avec l'agent ;
- cadrer intentions et fiches ;
- lancer des chantiers ;
- répondre aux sondages : acceptation des critères, attestations, limites, détours ;
- suivre l'avancement et les PR.

L'agent derrière la vue : « celui qui a lancé le serveur », c'est-à-dire la session qui l'a démarré. Le serveur survit à
cette session : la question de sa durée de vie est posée.

Parité des outils : « avec Copilot j'ai pas ça ». Remote Control n'existe que dans Claude Code ; la solution doit marcher
de la même façon pour Claude Code et Copilot CLI (puis les autres), sans dépendre d'une fonction propre à un outil. C'est
`drwil serve` qui porte le chat.

## Existant

Relevé dans le code le 2026-11-22.

- `drwil serve` est en lecture seule : `packages/drwil/src/serve.ts` n'accepte que `GET` (toute autre méthode reçoit
  405 `read-only`) ; ses routes (`/api/...`) lisent état, fiches, journal, PR et releases (`packages/drwil/src/serve-board.ts`,
  `packages/drwil/src/serve-details.ts`, `packages/drwil/src/serve-journal.ts`, `packages/drwil/src/serve-forge.ts`, `packages/drwil/src/serve-github.ts`, `packages/drwil/src/serve-gitlab.ts`,
  `packages/drwil/src/serve-releases.ts`). Toute réponse passe par le masquage (QUA-271, aucune donnée nominative ni secret dans une
  réponse).
- Accès : sur `127.0.0.1` sans jeton ; ailleurs, jeton exigé (`DRWIL_SERVE_TOKEN`, 32 caractères au moins), présenté
  une fois par l'adresse puis gardé en cookie sous forme d'empreinte (`packages/drwil/src/serve-auth.ts`, QUA-281, refus de démarrer
  sans jeton hors de `127.0.0.1`). Publication sur le réseau privé par `tailscale serve` (`packages/drwil/src/serve-publish.ts`,
  QUA-277 démarrage à l'ouverture de session, QUA-278 repli sans Tailscale).
- Lien donné à l'humain : sous Claude Code par `.claude/hooks/serve-welcome.mjs` (`systemMessage`) ; Copilot CLI n'a pas
  ce canal, son humain demande `/drwil-serve`.
- Gestes humains : posés par des sondages dans le chat de l'outil, lus par des hooks (`.claude/hooks/start-poll.mjs`,
  `.claude/hooks/accept-poll.mjs`, `.claude/hooks/attest-poll.mjs`, `.claude/hooks/limit-poll.mjs`, `.claude/hooks/detour-poll.mjs`, `.claude/hooks/verdict-poll.mjs`, `.claude/hooks/move-poll.mjs`,
  `.claude/hooks/queue-poll.mjs`, socle `.claude/hooks/prepared-poll.mjs` ; formes des autres outils traduites par `.claude/hooks/portable-polls.mjs` et
  `.claude/hooks/copilot-polls.mjs`, QUA-235 et QUA-266). Ces hooks lisent la réponse dans le résultat de l'outil de question de
  l'agent : aucun ne lit une réponse venue d'ailleurs.
- Agent non interactif : le banc lance déjà `claude -p`, `copilot -p` et `gemini -p` (`outils/banc-agents-cli.mjs`),
  sans reprise de session.

## Questions à trancher

- [décision] Canal serveur ↔ agent : mode non interactif (`claude -p`, `copilot -p`, déjà utilisés par le banc), SDK ou
  protocole d'agent propre à chaque outil (ACP, SDK Claude Agent…), reprise de session (`--resume` ou équivalent) ; un
  canal commun à tous les outils ou un adaptateur par outil.
- [décision] Quel agent : la session qui a lancé le serveur, une session lancée par le serveur, ou la reprise de la
  dernière ; que se passe-t-il quand la session d'origine se termine alors que le serveur tourne encore.
- [décision] Preuve des gestes humains : une réponse donnée dans la vue doit être lue par les mêmes hooks que dans le
  chat (mêmes refus, même corrélation), sans second chemin moins sûr ; l'attestation et le verdict de recette, gardés au
  terminal par la note du 2026-11-13, passent-ils par la vue ?
- [décision] Authentification dès que la vue écrit : le jeton actuel suffit-il, faut-il une confirmation par geste, un
  journal des actions, une couche OIDC optionnelle (note du 2026-11-13) ; la vue est ouverte sur Tailscale, au téléphone.
- [décision] Périmètre (QUA-018, dépôt drwil ou livrable gabarit) : dans le paquet, pour tout adoptant, ou d'abord dans
  le dépôt.
- [décision] Découpage possible : 1. intentions depuis la vue, 2. sondages, 3. lancement de chantiers, 4. conversation
  complète ; ordre et premier lot.
