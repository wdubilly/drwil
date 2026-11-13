# Audit de risques et dette technique

> Dernier scan : 2026-11-12
> Santé globale : 🟠 Fragile

Périmètre lu (via `.drwil/ia-first.json`) : fiches et intentions sous `docs/projects/` et `docs/intentions/`,
contrats par `node .githooks/glossary.mjs --contract <ID>` (QUA-016, QUA-040, QUA-067, QUA-100, QUA-175,
QUA-235, QUA-249, QUA-251, QUA-262), code de `.githooks/`, `.claude/hooks/`, `packages/drwil/src/`, workflows
`.github/workflows/`, tests associés. Lecture seule : aucun contrôle relancé (pas de `run-checks` ni de
`verify`), état de gouvernance lu en CLOSING (PR du chantier `init-marque-ia-ce-qui-est-faisable` non fusionnée).

Dépôt ou livrable (QUA-018, périmètre explicite dépôt drwil / livrable gabarit) : tous les fichiers fautifs de
RSK-1, RSK-3, RSK-5, RSK-6, RSK-7 et RSK-11 sont identiques à leur copie du gabarit
(`packages/drwil/templates/common/base/.githooks/…`) ; RSK-2, RSK-8 et RSK-9 touchent aussi le hook livré
(`packages/drwil/templates/common/tools/claude/.claude/hooks/attest-poll.mjs`, identique). Les défauts atteignent
donc les projets adoptants, pas seulement ce dépôt.

## Vue de la consommation

Source : `.drwil/usage.jsonl` (82 lignes, du 2026-10-04 au 2026-11-12 ; 79 lignes issues des journaux de
Claude Code, 3 estimées à la main au début).

| Mesure | Valeur |
|---|---|
| Tokens cumulés (champ `tokens`) | ≈ 201,0 M |
| dont sortie (`output`) | ≈ 5,6 M |
| Lectures de cache (`cache_read`, hors `tokens`) | ≈ 1 265 M |
| Durée cumulée | 4 898 min (≈ 82 h) |
| Modèles | `claude-opus-5-5` seul : 68 chantiers, ≈ 172,9 M ; `claude-sonnet-5-5` : 8, ≈ 18,5 M ; mixtes Opus + Sonnet ou Haiku : 3, ≈ 9,3 M ; `claude-sonnet-5` (estimés) : 3, 0,24 M |
| Depuis le dernier audit (2026-10-04) | quasi tout le cumul ci-dessus (l'audit précédent précède la mesure par les journaux) |
| Journée du 2026-11-12 | 3 chantiers, ≈ 9,5 M tokens, 262 min |
| Trois chantiers les plus coûteux | `limites-pendant-le-chantier` 19,9 M (234 min), `drwil-serve` 14,7 M (334 min), `ci-rapide-pour-la-doc` 11,3 M (195 min) |

## Synthèse

| ID | Risque | Catégorie | Gravité | Fichiers concernés | Action proposée |
|---|---|---|---|---|---|
| RSK-1 | `pr-watch` dit « CI verte » quand seuls les jobs du `push` (sautés) sont vus, avant que la CI de la PR n'existe | Écart de cadrage (QUA-100, QUA-262) | 🔴 | `.githooks/pr-watch.mjs` (l. 109-123, 146, 159), `.github/workflows/ia-first.yml` (l. 4-8, 79-80, 276-281), `.githooks/pr-watch.test.mjs` (l. 46-52), `.githooks/close-checks.mjs` (l. 171-190) | Ne compter `SKIPPED` ni comme réussite ni seul ; exiger la présence des contrôles requis (job `checks` d'un run `pull_request` sur la tête de la PR) avant « verte » |
| RSK-2 | Le hook d'attestation refuse avec un seul message générique, quelle que soit la cause : diagnostic impossible, repli au terminal | Écart de cadrage (QUA-235, QUA-267) + Tests | 🔴 | `.claude/hooks/attest-poll.mjs` (l. 24-26, 49-59, 79, 84-95, 103-104), `packages/drwil/test/claude-hooks.test.mjs` (l. 47-57), `.drwil/evidence/attestations/QUA-067-2026-11-12T20-41-24-517Z.json`, `.drwil/evidence/attestations/QUA-092-2026-11-12T22-11-08-371Z.json` | Un motif par refus (champ ajouté, résumé différent avec le diff, réponse illisible, refus humain, délai, preuve changée) ; ajouter un test sur une charge utile réelle de Claude Code |
| RSK-3 | La ligne « Unreleased » du changelog (et README, carte) exigée « dans le commit de clôture » est refusée en CLOSING par la barrière de périmètre | Écart de cadrage (QUA-040) | 🟠 | `.githooks/scope-gate.mjs` (l. 35-46, 71), `.githooks/state-context-texts.mjs` (l. 60), `packages/drwil/CHANGELOG.md` (l. 3-16) | Trancher où s'écrit la ligne : l'admettre en CLOSING (liste fermée `OUT_OF_SCOPE`) ou déplacer la consigne en fin de BUILD, et le faire vérifier par `close.mjs --check` |
| RSK-4 | La garde d'écriture de l'agent (QUA-016) ignore presque tout le code de ce dépôt : préfixes de code configurés inexistants | Écart de cadrage (QUA-016) | 🟠 | `.drwil/ia-first.json` (`layerPrefixes`, `codePrefixes`, `extraCodeGlobs`), `.githooks/scope.mjs` (l. 38-46), `.claude/hooks/scope-reminder.mjs` (l. 106), `.githooks/check-architecture.mjs` (l. 38) | Déclarer `packages`, `outils`, `.claude` comme code, retirer `app`, `tests`, `src`, `scripts`, `e2e`, `docker-compose*.yml` absents |
| RSK-5 | Appels `gh`/`glab` sans délai : le suivi « 30 minutes au plus » peut se bloquer indéfiniment | Sécurité/stabilité | 🟠 | `.githooks/pr-watch.mjs` (l. 95-96), `.githooks/merge-auto-forge.mjs` (l. 7-9) ; à comparer à `.githooks/close-branches.mjs` (l. 38) | Passer un `timeout` à `spawnSync` (comme `.githooks/close-branches.mjs`) ; un délai atteint vaut « non exécuté » |
| RSK-6 | `pr-watch` ne compare pas la tête de la PR à `HEAD` local : juste après un push, il peut juger le commit précédent | Écart de cadrage (QUA-100) | 🟠 | `.githooks/pr-watch.mjs` (l. 126-134, 159), comparé à `.githooks/close-checks.mjs` (l. 183) | Exiger `headRefOid === git rev-parse HEAD` (ou attendre) avant de conclure |
| RSK-7 | La preuve qui débloque la file (`.drwil/evidence/main-ci.json` (si présent)) est un fichier local que rien n'empêche l'agent d'écrire | Sécurité | 🟡 | `.githooks/pr-watch-main.mjs` (l. 44-50, 118-128), `.claude/settings.json` (l. 193-195) | Refuser l'écriture d'agent sur `.drwil/evidence/main-ci.json` (si présent) (règle `deny` comme `.drwil/state.json` (si présent)) ou revérifier par `gh` au moment de `next` |
| RSK-8 | Le hook d'attestation relance `verify` (les contrôles du contrat) en PreToolUse et PostToolUse, sans délai déclaré | Stabilité | 🟡 | `.claude/hooks/attest-poll.mjs` (l. 78, 96), `.claude/settings.json` (l. 34-43, 72-81), `packages/drwil/src/attest.ts` (l. 25, 103) | Déclarer un `timeout` adapté sur les hooks `AskUserQuestion`, ou réutiliser le verdict de la préparation |
| RSK-9 | Le filtre « (recommandé) » s'applique à tout le sondage, résumé du contrat et essai de l'agent compris | Écart de cadrage (QUA-235) | 🟡 | `.claude/hooks/attest-poll.mjs` (l. 26) | Ne chercher la recommandation que dans les libellés et descriptions des options |
| RSK-10 | Audit précédent figé au 2026-10-04 sous un autre nom que celui de la recette | Code mort / doc | 🟡 | `docs/audit-risques.md`, `docs/recipes/audit-risks-and-debt.md`, `.githooks/scope-gate.mjs` (l. 44-45) | Remplacer `docs/audit-risques.md` par docs/audit-risks.md (ce rapport) et garder un seul nom |
| RSK-11 | Le jeton CI GitLab passe en argument de `curl`, lisible par tout processus du runner | Sécurité | 🟡 | `.githooks/run-checks-pr.mjs` (l. 90) | Passer l'en-tête par un fichier (`--header @fichier`) ou par `--config` en entrée standard |

## Détail des risques majeurs

### RSK-1 — « CI verte » sur les seuls jobs du push

- **Attendu** (QUA-100, suivi de la CI d'une PR : « jamais "verte" sans l'avoir vu » ; QUA-262, la clôture n'est
  acquise qu'une fois la CI de la PR verte sur les contrôles confiés à la CI) : `pr-watch` dit « verte » quand la CI
  **de la PR** est finie et réussie.
- **Réellement codé** :
  - `.github/workflows/ia-first.yml` l. 276-281 : sur le push d'une branche dont une PR est ouverte, `saute=true`
    et les jobs `plan` et `checks` sont **sautés** (l. 4-8, 79-80) ; la vraie CI est celle de l'événement
    `pull_request`, qui démarre à part.
  - `.githooks/pr-watch.mjs` l. 112 : `bucket()` classe `SKIPPED` (et `NEUTRAL`) en `"pass"` ; l. 117-123 `ciOf()`
    rend `green` dès qu'aucun contrôle n'est en échec ni en attente. Rien ne vérifie qu'un contrôle requis (job
    `checks` du run `pull_request`) figure dans `statusCheckRollup`.
  - Dans la fenêtre où le run `push` est fini (jobs sautés, `matrice-os` réussi) et où le run `pull_request` n'est
    pas encore inscrit, `look()` voit uniquement des réussites et des sauts : « CI verte (N contrôle(s)) », code 0.
  - l. 146 : `proven()` ajoute alors « Contrôles confiés à la CI joués par cette CI : … » sans avoir vérifié qu'ils
    figurent dans le rollup ; `.githooks/close-checks.mjs` l. 171-190 (`closingCi`) hérite du même verdict.
  - Le test `.githooks/pr-watch.test.mjs` l. 46-52 **affirme** ce comportement (un run `SKIPPED` compté dans
    « verte (3 contrôle(s)) ») ; aucun test du cas « seul le run push est visible ».
  - La CI livrée a le même saut (`packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml`) : le
    défaut existe chez tous les adoptants GitHub.
- **Risque encouru** : une fusion automatique, une clôture déclarée acquise ou un enchaînement de file sur une CI
  qui n'a pas tourné. Constaté aujourd'hui (signalement de l'humain), et le code le permet tel qu'il est écrit.
- **Correctif recommandé** : un sondage `SKIPPED` ne compte jamais pour « verte » ; exiger au moins un contrôle
  réellement réussi portant le nom du job requis (`checks`, lisible par `gh pr checks --required` ou la protection
  de branche) sur `headRefOid` ; sinon « en cours » jusqu'au délai, puis « non exécuté ». Ajouter les tests :
  push seul visible, run PR absent, run PR en retard. Fiche de correction à cadrer (QUA-016).

### RSK-2 — Refus d'attestation sans raison lisible

- **Attendu** (QUA-235, le hook ne confirme que la réponse humaine à un sondage préparé ; QUA-267, l'attestation se
  propose d'abord par le sondage dans le chat, le terminal en repli) : un sondage préparé par `drwil attest-poll`
  et validé par l'humain enregistre l'attestation ; un refus dit pourquoi.
- **Réellement codé** (`.claude/hooks/attest-poll.mjs`) :
  - l. 49-51 : un seul texte `refused` (« utiliser la préparation `drwil attest-poll`, sans réponse, défaut ni
    recommandation ») pour **toutes** les causes : champ inattendu dans `tool_input` (l. 24), plusieurs questions
    (l. 25), « (recommandé) » n'importe où (l. 26), préparation différente du résumé recalculé (l. 79 :
    `prepared.message` vide quand la préparation réussit, donc le texte générique), préparation absente ou expirée
    (l. 84-92), réponse illisible **ou refus volontaire de l'humain** (l. 95). Aucun diff ni champ fautif n'est dit.
  - l. 96-102 : l'échec de `attest()` dit seulement « attestation refusée : rien n'a été enregistré »
    (`packages/drwil/src/attest.ts`, texte `refused`), y compris quand le snapshot recalculé diffère.
  - Indices du jour : les attestations `.drwil/evidence/attestations/QUA-067-2026-11-12T20-41-24-517Z.json` (QUA-067, hooks de Gemini) et
    `.drwil/evidence/attestations/QUA-092-2026-11-12T22-11-08-371Z.json` (QUA-092, garantie de couverture sur dossier vide) ont `origin: null` et
    `note: null`, signature d'un passage par le terminal, et non par le sondage. Le dossier
    `.drwil/evidence/attest-polls/` (si présent) est vide mais modifié à 20:54 (heure locale), avant l'attestation au terminal :
    une préparation y a été écrite puis consommée, ce qui situe le refus au **PostToolUse** (forme du retour ou
    nouvelle vérification), pas à la préparation. La cause exacte ne peut pas être établie sans la charge utile
    réelle : c'est précisément le défaut.
  - Test : `packages/drwil/test/claude-hooks.test.mjs` l. 47-57 simule le PostToolUse « Claude Code 2.1 » à la
    main ; aucun test ne rejoue une charge utile capturée d'une vraie session, et le contrat le reconnaît (« aucun
    essai réel prétendu »), voir aussi `docs/intentions/essais-reels-en-attente.md` (partie « ex-attestation-chat-essais-reels »).
- **Risque encouru** : l'attestation depuis le chat ne fonctionne pas en pratique et l'humain repasse par le
  terminal ; chaque refus coûte une boucle de diagnostic à l'aveugle.
- **Correctif recommandé** : un message par cause (avec, pour un écart de forme, la liste des clés en trop et, pour
  un résumé différent, la première ligne qui diffère) ; distinguer « l'humain a choisi Refuser » d'un refus de
  forme ; écrire la dernière charge utile refusée (sans secret) dans `.drwil/evidence/` pour la rejouer ; ajouter
  un test sur une charge utile réelle. Fiche de correction à cadrer.

### RSK-3 — Ligne « Unreleased » exigée à la clôture, refusée en CLOSING

- **Attendu** (QUA-040, drwil entretient la carte, le README et le changelog) : « À la clôture d'un chantier, son
  commit met à jour le README et ajoute sa ligne "Unreleased" au changelog s'il change ce que voit l'utilisateur » ;
  le rappel CLOSING le répète (`.githooks/state-context-texts.mjs` l. 60).
- **Réellement codé** : `.githooks/scope-gate.mjs` l. 71 refuse en dehors de BUILD tout fichier hors de la liste
  `OUT_OF_SCOPE` (l. 35-46), qui contient fiches, preuves, consommation, attestations, mais ni
  `packages/drwil/CHANGELOG.md`, ni `README.md`, ni `docs/architecture.md`. Aucun contrôle de `.githooks/close.mjs` ne
  vérifie non plus la ligne (aucune occurrence de « Unreleased » dans `.githooks/*.mjs` hors textes).
- **Constat** : les clôtures du jour `e131b85` (« un lancement refusé le dit… ») et `6d696b9` (« la fusion
  automatique… fonctionnent sur GitLab »), visibles par l'utilisateur, n'ont touché ni le changelog ni le README ;
  la section « Unreleased » (`packages/drwil/CHANGELOG.md` l. 3-16) ne mentionne que la reprise des contrôles.
- **Risque encouru** : notes de version fausses à la prochaine release (QUA-041, la documentation lue par un
  nouvel utilisateur dit vrai), consigne impossible à suivre sans contournement.
- **Correctif recommandé** : décision humaine sur l'emplacement de la ligne (CLOSING admis par liste fermée, ou
  fin de BUILD), puis un signal de `close.mjs --check` quand la fiche touche du code livré sans ligne
  « Unreleased ». Rattraper les lignes manquantes des deux chantiers du jour.

### RSK-4 — Préfixes de code fictifs : garde QUA-016 côté agent inactive sur l'essentiel du code

- **Attendu** (QUA-016, rappel de cadrage) : « Tout fichier de code indexé est couvert par le bloc scope d'une
  fiche » ; périmètre « tout le dépôt (fichiers indexés), hors docs/ et le markdown » ; refus avant écriture côté
  agent par `.claude/hooks/scope-reminder.mjs`.
- **Réellement codé** : `.githooks/scope.mjs` l. 38-46 (`isCode`) ne reconnaît que les préfixes de
  `.drwil/ia-first.json` : `layerPrefixes` = `app`, `tests`, `src`, `scripts` ; `codePrefixes` = `scripts`,
  `.githooks`, `e2e` ; `extraCodeGlobs` = `docker-compose*.yml`. Aucun de app/, tests/, src/, scripts/,
  `e2e/` n'existe à la racine, aucun `docker-compose*.yml` n'est suivi. Vérifié en lecture :
  `isCode("packages/drwil/src/attest.ts")`, `isCode("outils/banc.mjs")`,
  `isCode(".claude/hooks/attest-poll.mjs")`, `isCode("packages/drwil/templates/…/attest-poll.mjs")`,
  `isCode("packages/drwil/bin/drwil.js")` rendent tous `false` ; seul `.githooks/` est vu.
  `.claude/hooks/scope-reminder.mjs` l. 106 sort donc sans rien dire pour ces fichiers ;
  `.githooks/check-architecture.mjs` l. 38 et `.githooks/scope.mjs` l. 197 utilisent le même juge.
- **Atténuation** : la barrière au commit (`.githooks/scope-gate.mjs`) juge tout fichier hors fiches, donc le refus arrive,
  mais tard (au commit), après le travail.
- **Correctif recommandé** : aligner la configuration sur l'arbre réel (`packages`, `outils`, `.claude`) et retirer
  les préfixes absents ; un contrôle pourrait signaler un préfixe déclaré qui n'existe pas.

### RSK-5 — Appels à la forge sans délai

- **Attendu** (QUA-100) : « 30 minutes au plus », puis « non exécuté ».
- **Réellement codé** : `.githooks/pr-watch.mjs` l. 95-96 (`ghJson`) et `.githooks/merge-auto-forge.mjs` l. 7-9
  appellent `spawnSync("gh"|"glab", …)` sans `timeout` ; la borne de `watch()` (l. 163) n'est testée qu'entre deux
  appels. Un `gh` bloqué (réseau, invite d'authentification) suspend le suivi sans fin. À l'inverse,
  `.githooks/close-branches.mjs` l. 38 passe déjà `timeout: 20000`.
- **Correctif recommandé** : même `timeout` partout ; un délai atteint rend `null`, donc « non exécuté ».

### RSK-6 — Tête de PR non comparée à HEAD

- **Attendu** (QUA-100) : jamais « verte » sans avoir vu la CI du travail poussé.
- **Réellement codé** : `look()` lit `headRefOid` (`.githooks/pr-watch.mjs` l. 127, 133) mais `watch()` ne le compare
  jamais au commit local ; seule `closingCi` le fait (`.githooks/close-checks.mjs` l. 183). Juste après un push,
  le rollup peut encore être celui du commit précédent, vert.
- **Correctif recommandé** : passer `HEAD` à `watch()` et attendre tant que `head` diffère ; à traiter avec RSK-1.

## Étape suivante

Choisir un ID et répondre : « Corriger RSK-X ». Chaque correctif touche du code livré (gabarit et copies du
dépôt) : une fiche de correction se cadre d'abord (QUA-016), et RSK-3 demande d'abord une décision humaine sur
l'endroit où s'écrit la ligne « Unreleased ». Ordre conseillé : RSK-1 et RSK-6 ensemble (même fichier), puis RSK-2,
puis RSK-3.

## Suite donnée (2026-11-13)

Constats revérifiés dans le code avant le cadrage : RSK-1, RSK-2, RSK-4, RSK-5, RSK-7, RSK-9, RSK-11 confirmés.
RSK-10 est corrigé à la lecture : `docs/audit-risques.md` est le nom voulu en français (docs/audit-risks.md en
anglais, choisi par la langue du projet dans `.githooks/run-checks.mjs` et `.githooks/dashboard.mjs`) ; le défaut
réel est que la recette ne cite que le nom anglais. Ce rapport remplace donc celui du 2026-10-04 sous le même nom.

- RSK-1, RSK-5, RSK-6 : `docs/projects/pr-watch-attend-la-ci.md` (avec OPT-2 de `docs/decouverte-valeur.md`).
- RSK-2, RSK-8, RSK-9 : `docs/projects/refus-d-attestation-lisible.md`.
- RSK-3 : la ligne « Unreleased » s'écrit en fin de BUILD (décision du 2026-11-13) —
  `docs/projects/unreleased-en-fin-de-build.md`.
- RSK-4, RSK-7, RSK-10, RSK-11 : `docs/projects/durcissements-audit-2026-11-12.md`.
