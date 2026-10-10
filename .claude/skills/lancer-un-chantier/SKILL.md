---
name: drwil-lancer
description: Lancer un chantier en un geste humain — ouvrir un sondage des fiches cadrées ; la réponse de l'humain, lue par l'outil, passe la gouvernance en REALISATION. À utiliser quand l'humain veut démarrer la réalisation d'une fiche.
---

# Lancer un chantier (`/drwil-lancer`)

La décision de lancer appartient à l'humain : c'est **sa réponse au sondage**, lue par un hook
de l'outil (`.claude/hooks/saisie-drwil.mjs`), qui fait la transition — jamais l'agent.

1. Lister les fiches cadrées : `node .githooks/etat.mjs fiches --json` (bloc `cadrage` commité,
   fiche non terminée ni de référence). Aucune : le dire et s'arrêter. La liste est **déjà
   ordonnée** : fiches prêtes d'abord (`prete` : aucune `[décision]` ouverte), puis par
   `priorite` de l'index ; `decisions` compte celles qui restent à trancher.
2. Lire les sections « Ordre proposé » des intentions (`docs/intentions/`) : elles peuvent placer
   une fiche avant une autre de même rang. Relever aussi les intentions P1 de l'index encore sans
   fiche cadrée.
3. Ouvrir **un** sondage (Claude Code : `AskUserQuestion` ; Copilot CLI : `ask_user`), dans cet
   ordre, et le précéder d'un message court qui cite les intentions P1 « à cadrer » (jamais
   proposées au lancement) :
   - Claude Code : `header` exactement `drwil-lancer` ; une option par fiche, **libellé = chemin
     exact** (ex. `docs/projets/<fiche>.md`), description = titre. Au plus 4 options, les
     premières de la liste ; une fiche non prête garde sa place en fin, sa description dit
     « non prête : N décision(s) à trancher d'abord » ; l'humain peut taper un autre chemin dans
     « Autre ».
   - Copilot CLI : `message` commençant par `drwil-lancer :`, choix = chemins exacts.
   - **Recommander** : la première fiche prête, en premier, avec « (Recommandé) » et la raison
     dans sa **description** — jamais dans le libellé.
   - **Interdit** : remplir `answers` ou une valeur par défaut (`default`) : le hook refuse le
     sondage. L'humain choisit seul.
4. Après la réponse, relire l'état : `node .githooks/etat.mjs`. En REALISATION sur la fiche
   choisie : réaliser. Sinon : rapporter le refus tel quel, sans retenter autrement.

Sans sondage dans l'outil : donner à l'humain la commande `node .githooks/etat.mjs lancer`, à
lancer dans un terminal interactif.
