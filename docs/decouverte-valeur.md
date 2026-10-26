# Découverte de valeur et opportunités produit

> Dernier scan : 2026-10-21 (le précédent, du 2026-10-17, est remplacé :
> ses opportunités OPT-1 à OPT-5 et OPT-10 sont livrées en 0.6.2 et 0.6.3,
> OPT-6 à OPT-8 sont reprises ci-dessous, OPT-9 aussi).
> État du projet : paquet `drwil` 0.6.9 fusionné (PR #190, fluidité de la
> clôture). Copilot CLI et Gemini CLI tenus, Codex et Cursor repassés en
> intention. Prochaine version : 0.7.0, « la preuve qui dure », aucune
> fiche cadrée. Objet de ce scan : vérifier l'ordre de la 0.7.0 et de la
> 0.7.x avant de cadrer. La roadmap suivie vit dans
> `docs/projects/pending.md` (« Ordre de réalisation »).

## Aperçu de consommation

`.drwil/usage.jsonl` : 28 chantiers mesurés automatiquement (journaux de
Claude Code, modèle `claude-opus-5-5`), soit 35,06 M de tokens et
890 minutes ; dont 15 depuis le dernier scan : 19,47 M de tokens et
526 minutes (dernier chantier mesuré : 2026-10-19). Les plus coûteux : le
détour (4,31 M), la fiche de recette (3,93 M), la reprise par sous-agent
(2,45 M). Les chantiers 0.6.7 à 0.6.9, menés sous Copilot CLI, ne sont
pas mesurés : la mesure automatique ne lit que Claude Code (voir OPT-1).

## Opportunités prioritaires (matrice valeur / effort)

Lecture : 🟢 effort faible, 🟡 moyen, 🔴 élevé ; « format » = change un
format, une sortie ou le verdict (version mineure, pas un correctif).

| ID | Fonctionnalité proposée | Pourquoi (valeur) | État du code existant | Effort | Action recommandée |
|---|---|---|---|---|---|
| OPT-1 | La consommation de Copilot CLI mesurée à la clôture | Copilot CLI est l'outil le plus utilisé sur ce dépôt et les trois derniers chantiers (0.6.7 à 0.6.9) ne sont pas chiffrés : l'objectif « baisser la consommation de tokens » n'est plus mesuré. | `.githooks/consumption.mjs` ne lit que `~/.claude/projects/` ; les traces de Copilot sont dans `~/.copilot/session-store.db` (table `session_usage`) et `~/.copilot/session-state/`. Intention `docs/intentions/consommation-autres-outils.md`. | 🟡 Moyen | **0.7.x, tôt** : un lecteur par outil, Copilot CLI d'abord ; garantir que seuls les champs de consommation sont lus. |
| OPT-2 | Une attestation tombe quand ce qu'elle couvre change | Confiance dans le verdict : un PASS peut reposer sur une attestation d'un état révolu. Treize contrats reposent déjà sur une attestation humaine. | Attestations versionnées par empreinte (`packages/drwil/src/verify.ts`, `packages/drwil/src/attest.ts`), liées au texte du contrat et à la définition des contrôles, pas à son objet. Intention (traitée, voir le journal). | 🔴 Élevé, format | **0.7.0, priorité 1** (retour du pilote `drwil_com`) ; mécanisme à trancher dans la fiche technique. |
| OPT-3 | Des critères et des preuves qui survivent à la clôture | Traçabilité après le chantier et rejeu en CI : aujourd'hui la fiche et ses critères sont supprimés à la clôture, seuls les contrats durent. | `activeBrief` (`packages/drwil/src/criteria.ts`) ; `packages/drwil/src/evidence.ts` ; trailer `Drwil-Brief` déjà écrit sur les commits. Fait (journal du 2026-10-21). | 🔴 Élevé, format | **0.7.0, priorité 2**. |
| OPT-4 | Vérifier la barrière de fusion (absente, mal configurée, conforme, non vérifiée) | Sans protection de branche, une fusion automatique passe avant la CI (PR du pilote). Ici la PR #190 est restée bloquée jusqu'au vert : la barrière existe, mais le livrable ne la contrôle pas chez le client. | `drwil doctor` (`packages/drwil/src/doctor.ts`) ; vérification de ruleset propre à ce dépôt (`.github/scripts/verifier-ruleset.mjs`). Intention `docs/intentions/forge-dans-le-livrable.md`. | 🟡 Moyen | **0.7.0, priorité 3** (nouveau diagnostic, pas un correctif). |
| OPT-5 | La clôture vérifie la cohérence de la documentation | Constaté à la clôture du 2026-10-21 : le commit de clôture a été refusé deux fois par `check-docs` (chemins cités vers des intentions retirées, fichier de code cité hors de toute fiche), chaque fois découvert au dernier moment. | `.githooks/check-docs.mjs` (bloquant au commit), `.githooks/close.mjs` (signale déjà intention touchée, références mortes, QUA-048 et QUA-073). Chantier fait : journal du 2026-10-21 (`docs/projects/journal.md`). | 🟡 Moyen | **0.7.0, en complément** : même moment (la clôture), à cadrer avec les messages existants pour ne pas les empiler. |
| OPT-6 | Une note de recette conservée dans le dépôt à chaque version | La fiche de recette et le verdict n'existent que sur la pré-release GitHub : ils ne suivent pas le code. | Fiche de recette (QUA-051), verdict humain (QUA-053), promotion (QUA-054). Faite (journal du 2026-10-21). | 🟢 Faible | **0.7.0, en complément** : prolonge les contrats de release existants. |
| OPT-7 | Une vue de relecture : ce qui demande le jugement humain dans une PR | Le goulot est le temps d'arbitrage du demandeur, pas le code ; montrer décisions, cadrage, règles, preuves et exceptions réduit le temps de relecture. | Fiche de recette HTML en intention (l'intention « fiche de recette HTML » (abandonnée le 2026-10-25)), tableau de bord (`.githooks/dashboard.mjs`). Intention `docs/intentions/vue-de-relecture.md`. | 🔴 Élevé | **0.7.x**, après la preuve durable (elle réutilise les critères conservés d'OPT-3). |
| OPT-8 | Fluidité : afficher qui décide chaque transition | Reste vivant de l'intention de fluidité : l'humain ne voit pas, d'un coup d'œil, ce que l'agent peut faire seul. | Réglage `transitions` de `.drwil/ia-first.json`, `node .githooks/state.mjs`. Intention `docs/intentions/fluidite-sans-perte-de-rigueur.md`. | 🟡 Moyen | **0.7.x**, après OPT-7 (même surface d'affichage). |
| OPT-9 | Retirer les citations de fiche restées dans le code non modifié | Neuf citations signalées en avertissement à chaque `check-docs` (QUA-049) : du bruit qui masque les vrais signaux. | `.githooks/check-code-rules.mjs` (`briefReferences`). Intention `docs/intentions/coherence-de-la-doc.md` (ex-« citations-de-fiche-heritees »). | 🟢 Faible | À glisser dans un chantier qui touche déjà ces fichiers. |
| OPT-10 | Publier `drwil` sur npm | Rendrait l'URL de release et le tarball inutiles : `npx drwil init` direct. | Paquet empaquetable et éprouvé en CI (contrôle `tarball`). Intention `docs/intentions/packager-kit-ia-first.md`. | 🟢 Faible technique, décision | Hors 0.7.x : décision du demandeur. |

Écartés de la roadmap proche (valeur faible aujourd'hui ou décision
produit préalable) : Codex et Cursor (repassés en intention le
2026-10-19), personas, chantiers en parallèle, application de suivi,
validation commerciale, couche d'un nouveau dossier de code, couverture
à 100 %.

## Analyse détaillée des meilleures pistes

### OPT-2 — Attestation liée à son objet (0.7.0)
- **Problème résolu** : un PASS ne peut plus reposer sur un jugement
  humain périmé.
- **Briques existantes réutilisables** : `packages/drwil/src/verify.ts`
  (empreintes par contrôle), `packages/drwil/src/attest.ts` ;
  attestations déjà archivées dans `.drwil/evidence/attestations/`.
- **Ce qu'il reste à faire** : la fiche technique (règle de validité,
  correspondance attestation, contrat, preuve et objet ; fichiers
  supprimés, renommés, ajoutés), principe validé le 2026-10-17.
- **Impact si implémenté** : la promesse « DRWIL demands the proof » tient
  aussi pour les preuves humaines.

### OPT-3 — Critères et preuves durables (0.7.0)
- **Problème résolu** : à la clôture, la fiche est supprimée avec ses
  critères d'acceptation ; seule la ligne de contrat reste.
- **Briques existantes réutilisables** : `packages/drwil/src/criteria.ts`,
  `packages/drwil/src/evidence.ts`, trailer `Drwil-Brief`.
- **Ce qu'il reste à faire** : où conserver critères et preuves, sans
  réintroduire des citations de fiche mortes (QUA-049), et comment les
  rejouer en CI.
- **Impact si implémenté** : une revue ultérieure retrouve ce qui a été
  accepté et par quelle preuve.

### OPT-1 — Consommation de Copilot CLI (0.7.x)
- **Problème résolu** : la mesure s'arrête au 2026-10-19 ; trois chantiers
  menés sous Copilot CLI sont « non mesurés ».
- **Briques existantes réutilisables** : `.githooks/consumption.mjs` et sa
  ligne `.drwil/usage.jsonl` ; `~/.copilot/session-store.db` (table
  `session_usage`).
- **Ce qu'il reste à faire** : un lecteur Copilot qui ne lit que les champs
  de consommation, jamais un contenu de message, et qui écrit la même
  ligne.
- **Impact si implémenté** : chaque clôture chiffrée, quel que soit l'outil.

## Roadmap qui en découle (proposée, à valider)

Décision du demandeur le 2026-10-21 : les deux compléments, liés au
dernier chantier (la clôture), passent avant le cœur de la 0.7.0.

- **Avant la 0.7.0** — clôture et recette, deux chantiers distincts, dans
  cet ordre : OPT-5 (cohérence de la documentation à la clôture, friction
  vue le jour même), puis OPT-6 (note de recette conservée dans le dépôt).
- **0.7.0** — « la preuve qui dure » : OPT-2, OPT-3, OPT-4, dans l'ordre
  du pilote.
- **0.7.x** — mesure et efficacité : OPT-1 en tête (la mesure manque
  déjà), puis OPT-7 et OPT-8.
- **À glisser** : OPT-9 dans un chantier voisin. **Décision du demandeur** :
  OPT-10.

Limite : valeur et effort sont des estimations de l'agent, tirées du code,
des journaux et d'un seul pilote.

## Prochaine étape

Valider la roadmap, ou répondre : « Valide OPT-X pour la convertir en
intention » — ici toutes ont déjà une intention ; l'étape suivante est de
cadrer la fiche de clôture et de recette (OPT-5 et OPT-6), puis celle de la
0.7.0 (décisions ouvertes de l'attestation liée à son objet d'abord).
