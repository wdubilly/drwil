# Intention : suivre la durée de la CI et le contexte relu, et trancher leurs calibrages

**Statut** : proposée le 2026-10-25 — regroupement de 10 intentions et 1 note(s) lors du ménage du 2026-10-25 ; chaque partie reprend l'une d'elles, avec son statut d'origine.

## Besoin

Les chantiers « accélérer la CI sans perte de qualité » et « réduire le contexte relu par chantier » (journal du 2026-10-24) ont laissé des mesures à relever et des questions de calibrage, une intention chacune. Elles se tranchent ensemble : savoir si la CI et le contexte relu tiennent leurs objectifs, sans ajouter de contrat attesté, avant de retoucher la CI ou de découper le registre.

### suivre la durée de la CI comme un indicateur, pas comme un contrat attesté (ex-« objectifs-de-duree-ci-en-indicateur »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « accélérer la CI sans perte de qualité » (journal du 2026-10-24), décision du demandeur.

Fait le 2026-10-25 (journal) : la durée du job `checks` est relevée à la main
dans le journal de chaque chantier (référence de CI, catégorie hooks modifiés
ou inchangés), sans blocage ; QUA-122 est conservé comme preuve historique
(`docs/mesures-ci-reference.md`). Fait le 2026-10-30 : tendance dans le
tableau de bord et seuil d'alerte non bloquant (QUA-198, tendance de la durée
de CI et du cache lu par requête). Reste : réévaluer le seuil au fil des
relevés.

### relever la durée du job `checks` quand les hooks sont inchangés (ex-« releve-duree-checks-hooks-inchanges »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « accélérer la CI sans perte de qualité » (décision du demandeur, critère de durée, QUA-122).

Reporté par le demandeur le 2026-10-30 : le relevé reste vide jusqu'au
prochain chantier ordinaire clos à hooks inchangés ; le tableau de bord le
montrera dès qu'une ligne « hooks inchangés » sera au journal.

Le saut du rejeu par la branche principale (QUA-123) n'agit qu'une fois
fusionné : la CI lit sur master l'ancienne copie de `.githooks/base-checks.mjs`. Gain
attendu : environ 2 minutes de moins que les passages à hooks modifiés
(3m02 à 4m37).

### relever le cache lu moyen par requête après la réduction du contexte (ex-« releve-cache-lu-par-requete »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « réduire le contexte relu par chantier » (décision du demandeur : l'indicateur sorti des critères d'acceptation devient un relevé, sans seuil).

En attente du demandeur (2026-10-30) : choisir deux paires de chantiers
comparables, avant et après la réduction du contexte (journal du 2026-10-24).
Paires proposées d'après les requêtes et le cache lu par requête de
`usage.jsonl` (le risque de chaque fiche est à confirmer) : A, de 80 à 115
requêtes, `premier-commit-avant-adoption` (115, 145 k) et
`barriere-commit-de-fusion` (99, 105 k) le 2026-10-23, contre
`adopter-seuil-couverture` (114, 141 k) et `couverture-du-code-modifie` (83,
106 k) le 2026-10-30 ; B, de 50 à 60 requêtes, `verify-reprise-par-controle`
(52, 105 k) et `stab-squash` (52, 92 k), contre `e2e-et-attestation-precises`
(52, 74 k) et `registre-vise-les-sections-d-ia-first` (60, 70 k). Le
tableau de bord montre déjà la tendance du cache lu par requête.

Savoir si la lecture ciblée (QUA-124, lecture d'un contrat ou d'une entrée de
journal par son identifiant), les sorties courtes (QUA-126, `run-checks` limité
aux échecs), le sous-agent de contrôles (QUA-129) et la lecture forcée
(QUA-132, registre et journal jamais lus en entier avec Claude Code) baissent
vraiment le contexte relu à chaque requête.

### `checks-self-test` double-t-il `couverture-hooks` ? (ex-« checks-self-test-contre-couverture-hooks »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « accélérer la CI sans perte de qualité » (journal du 2026-10-24).

Mesuré au chantier : `checks-self-test` (≈ 30 s) et `couverture-hooks`
(≈ 34 s) rejouent les mêmes tests de `.githooks/`. Aucun des deux n'a été
retiré : l'absence de perte de garantie n'est pas prouvée (couverture-hooks
exige 100 %, checks-self-test nomme son propre contrat).

### jouer aussi les tests de `.githooks/` sur Node 24 (ex-« tests-des-hooks-sur-node-24 »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « accélérer la CI sans perte de qualité » (journal du 2026-10-24).

Le job `checks` joue toute la suite une seule fois, sur Node 22 (QUA-123) :
les tests de `.githooks/*.test.mjs` ne tournent donc plus sur Node 24, où ils
tournaient avant. `kit-tests` joue la suite du paquet (qui lance les hooks dans
des projets temporaires) sur Node 24, pas ces tests-là.

### le gain de CI atteint-il les projets adoptés ? (ex-« ci-livree-aux-projets-non-mis-a-jour »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « accélérer la CI sans perte de qualité » (journal du 2026-10-24).

Le moteur (`build`, `parallel`) et le saut du rejeu (QUA-123) sont livrés par
le gabarit des hooks ; `.drwil/ia-first.json` d'un projet existant ne déclare
ni `build`, ni `parallel`, ni `needsBuild` : sans mise à jour de sa
configuration il garde ses durées. Le workflow livré n'a changé ni pour la
version de Node, ni pour le doublon push / pull_request (propres à ce dépôt,
QUA-121).

### un échec non expliqué de QUA-004 au pre-push (ex-« alea-couverture-qua-004-au-pre-push »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « accélérer la CI sans perte de qualité » (journal du 2026-10-24).

Le 2026-10-24, le pre-push de la PR #221 a échoué sur « build + tests + seuil
de couverture (QUA-004) » ; relancé seul, puis repoussé, le même contrôle a
passé sans changement de code. La cause n'est pas établie (contrôles lancés en
parallèle, test de budget de temps sensible à la charge — déjà vu au pre-commit
et corrigé par la limite de parallélisme).

### un budget de temps des contrôles calibré pour les machines Windows de la CI (ex-« budget-temps-windows »)

Statut d'origine : proposée le 2026-10-17 — relevé pendant le chantier « un identifiant cité sans libellé est complété sous la réponse de l'agent » (journal du 2026-10-17), PR #138.

Le test « budget de temps : les contrôles au commit d'un projet équipé
restent rapides » (`packages/drwil/test/kit.test.mjs`) exige au plus
1500 ms. Le 2026-10-17, un job Windows de la CI l'a dépassé (1897 ms) sans
changement qui l'explique : relancé tel quel, il est passé (1009 ms).
Rouge passager, il arrête une file de chantiers et demande une relance à
la main.

**Décisions (2026-10-19, demandeur)** :

- Ne rien changer pour l'instant : budget gardé, job relancé en cas de
  dépassement isolé ; la question du cliquet reste ouverte.

### éprouver les gardes de lecture et le sous-agent dans une vraie session Claude Code (ex-« gardes-de-lecture-en-session-reelle »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « réduire le contexte relu par chantier ».

QUA-132 (registre et journal jamais lus en entier avec Claude Code) et
QUA-129/QUA-130 (sous-agent `drwil-checks` qui ne renvoie que le verdict
recopié mot pour mot) sont prouvés par des tests qui rejouent les hooks avec
des entrées simulées et lisent les fichiers livrés, comme QUA-072 (les hooks
et skills de Claude Code ne changent pas, prouvé sans session réelle). Aucune
vraie session Claude Code n'a été rejouée.

### découper le registre des contrats et le journal (ex-« decoupage-registre-et-journal »)

Statut d'origine : proposée le 2026-10-24 — limite du chantier « réduire le contexte relu par chantier » (hors périmètre décidé par le demandeur, à reprendre si la lecture ciblée ne suffit pas).

`docs/contracts.md` (≈ 181 ko) et `docs/projects/journal.md` (≈ 191 ko)
grossissent à chaque chantier. La lecture ciblée (QUA-124) et la lecture
forcée (QUA-132) évitent de les lire en entier, mais une lecture par plage
ou une recherche reste possible et les contrôles qui les lisent restent
liés à un seul fichier.

### Notes reprises de `docs/intentions/notes.md`

- 2026-10-24 — Accélérer la CI sans perte de qualité (reste après le chantier du 2026-10-24, voir `docs/projects/journal.md`) : suite unique + verdict par contrat via reporter (décision humaine, QUA-033) et jobs CI découpés via ciJob (renomment les checks exigés par le ruleset), seulement si la CI reste trop lente ; cache de compilation. Mesures : tableau de bord https://claude.ai/artifact/LVTAv9omSJ4h8bL9s22vbT
- 2026-10-23 — Réduire la consommation par chantier (barriere-commit-de-fusion : 1,6 M pondérés, 64 % de contexte relu, 85 min pour un petit correctif) : (1) sorties de state.mjs, run-checks et verify courtes en mode agent (seulement ce qui change ou échoue) ; (2) vérifier au cadrage que chaque critère sera lu par verify (ID entre backticks) ; (3) contrôle rapide formatage + couverture du seul fichier touché avant run-checks ; (4) consumption.mjs attribue par nom de branche : une branche de cadrage nommée d'après une fiche (cadrage/barriere-commit-de-fusion, qui en cadrait cinq) gonfle le chiffre de cette fiche — attribuer par session ou par chantier ; (5) mesurer le temps par étape (dev, contrôles, clôture, attente CI) pour savoir quelle piste rapporte le plus.
- 2026-10-26 — Verify en FAIL sans contrat en échec : contrat MANUAL (QUA-013, QUA-048) ou arbre modifié (dirtyWorktree) ; vu sur au moins 4 des 17 FAIL des 25 et 26 octobre (MANUAL), d autres avec arbre modifié. À rattacher à docs/intentions/suivi-ci-et-contexte.md.

### Durée de `drwil verify` et de chaque contrôle (notes du 2026-10-25)

Reprises de `docs/intentions/notes.md` ; cadrées le 2026-10-25 en quatre fiches, dont trois sont faites (durée par contrôle, QUA-136 ; `verify` en parallèle, QUA-139 ; reprise d'un verdict de `run-checks` sur un arbre identique, QUA-140, QUA-013 précisé — voir `docs/projects/journal.md`) ; la reprise contrôle par contrôle pour les itérations est faite (QUA-141, journal du 2026-10-25) ; le pre-push reprend aussi un verdict « ok » dont les fichiers du contrôle n'ont pas changé (QUA-152, journal du 2026-10-26) ; après un FAIL, `drwil verify --failed` rejoue les seuls contrats non PASS ni ATTESTED (QUA-159, journal du 2026-10-28).

- 2026-10-25 — Chronométrer chaque contrôle : fait (QUA-136, journal du 2026-10-25, durée par contrôle) ; reste à faire lire ces durées par le tableau « Durée de la CI drwil » (https://claude.ai/artifact/LVTAv9omSJ4h8bL9s22vbT), hors de ce chantier. À rattacher à docs/intentions/suivi-ci-et-contexte.md.
- 2026-10-25 — drwil verify est long (verify --evidence : ≈ 4 min 30 de bout en bout, PASS, le 2026-10-25 en VERIFY) : il relance en série tous les contrôles cités par le registre (packages/drwil/src/verify.ts, c.run), dont la suite complète du paquet avec couverture (npm run test:coverage) et 53 suites node --test filtrées par contrat (≈ 18 s à elles seules), alors que run-checks vient de les jouer en parallèle (QUA-119). Pistes : paralléliser verify via runAsync (.githooks/engine.mjs) — fait (QUA-139) ; reprendre les résultats de run-checks sur un arbre inchangé — fait (QUA-140, QUA-013 précisé), puis contrôle par contrôle pour les itérations — fait (QUA-141) ; suite unique avec verdict par contrat (QUA-033) ; après un PASS, ne pas tout rejouer quand seule la doc a changé (comme le « commit de documentation seule » de run-checks) ; après un FAIL, rejouer d'abord les seuls contrats en échec (option only, déjà utilisée par drwil attest). Vécu le 2026-10-25 (chantier dossiers-temporaires-des-tests, PR #230) : six passes de verify --evidence en 30 min (≈ 25 à 30 min sur 45), dont deux ou trois dues à des notes modifiées dans l'arbre pendant VERIFY ; un ou deux auraient suffi. À rattacher à docs/intentions/suivi-ci-et-contexte.md.

### documenter l'avertissement émis par un contrôle (`[ia-first-warning]`) dans son contrat (ex-« tests-de-timing-instables »)

Statut d'origine : ouverte le 2026-10-26 — limite non traitée de la clôture « tests de timing stables » (journal du 2026-10-26).

`run-checks` compte désormais comme avertissement non bloquant toute ligne `[ia-first-warning] <texte>` imprimée par un contrôle (le test de budget de temps au commit s'en sert). Le texte du contrat QUA-127 (résumé comptant chaque avertissement non bloquant) et la doc livrée ne le disent pas encore : `docs/contracts.md`, le catalogue et la doc des hooks étaient hors du cadrage du chantier.

### les chantiers vont-ils plus vite ? un journal des passes locales

Statut d'origine : proposée le 2026-10-26 — demande de l'humain, qui a
l'impression que les chantiers vont plus vite depuis la 0.9.0.

Le gain attendu de la 0.9.0 (reprise d'un verdict par `run-checks`,
`verify` et le pre-push : QUA-140, QUA-141, QUA-152) se joue en local, où
rien n'en garde la trace : on ne peut ni le montrer ni dire si les chantiers
vont plus vite. Garder, pour chaque passe locale (pre-commit, pre-push,
`run-checks`, `verify`), une ligne : date, branche ou chantier, contrôles
repris et rejoués, durée réelle de la passe ; la lire par chantier et dans
le tableau « Durée de la CI drwil »
(https://claude.ai/artifact/LVTAv9omSJ4h8bL9s22vbT).

Constat chiffré du 2026-10-26 (`.drwil/usage.jsonl`, chantiers d'au moins
5 minutes ; tokens pris comme taille du chantier) :

| Période | Chantiers | Durée médiane | Tokens médians | Minutes par million de tokens |
|---|---|---|---|---|
| 16 au 20 oct. | 27 | 25 min | 0,80 M | 33 |
| 21 au 24 oct. | 11 | 67 min | 2,42 M | 24 |
| 25 et 26 oct. (0.9.0) | 8 | 43 min | 0,72 M | 44 |

Aucun gain de durée visible ; la CI de la forge s'allonge (run médian de
3,2 à 5,9 min par chantier, job Windows de 4,3 à 6,1 min) et pèse environ
15 % d'un chantier. En local, le dernier pre-push du 26 a repris 130
contrôles et en a rejoué 17 (le plus lent : 40 s, contre 2 min 25 s pour la
couverture du paquet sur une passe complète), mais ce n'est qu'un instantané
écrasé à la passe suivante. Les 54 preuves `verify --evidence` du 25 et du
26 ont toutes rejoué tous leurs contrôles (129 à 143, de 3 à 7 min de durée
cumulée) : la reprise sur le verdict de `run-checks` (QUA-140) n'a jamais
servi à une preuve de clôture.

## Existant

Relevé dans chaque intention d'origine, à sa date ; non revérifié le 2026-10-25.

### suivre la durée de la CI comme un indicateur, pas comme un contrat attesté (ex-« objectifs-de-duree-ci-en-indicateur »)

**Existant (relevé le 2026-10-24)** :

- QUA-122 (durée du job `checks`) est un contrat Manuel, attesté par l'humain après
  trois relevés consignés au journal.
- Relevé le 2026-10-25 : QUA-122 devient une preuve historique couvrant le seul
  `docs/mesures-ci-reference.md` ; le relevé courant se fait au journal.

### relever la durée du job `checks` quand les hooks sont inchangés (ex-« releve-duree-checks-hooks-inchanges »)

**Existant (relevé le 2026-10-24)** :

- Durées relevées (hooks modifiés) : 3m02, 3m45, 4m37 ; hooks inchangés : aucune.

### relever le cache lu moyen par requête après la réduction du contexte (ex-« releve-cache-lu-par-requete »)

**Existant (relevé le 2026-10-24)** :

- `node .githooks/consumption.mjs --recorded` : « rouvrir après clôture »
  24,9 M de cache lu pour 147 requêtes (≈ 169 k par requête),
  « contournements complétés » 18,0 M pour 143 (≈ 126 k).
- Référence retenue par le demandeur : ≈ 170 k par requête.

### `checks-self-test` double-t-il `couverture-hooks` ? (ex-« checks-self-test-contre-couverture-hooks »)

**Existant (relevé le 2026-10-24)** :

- Deux contrôles de `.drwil/ia-first.json` lancent les tests de `.githooks/`.

### jouer aussi les tests de `.githooks/` sur Node 24 (ex-« tests-des-hooks-sur-node-24 »)

**Existant (relevé le 2026-10-24)** :

- Job `checks` (`.github/workflows/ia-first.yml`) : Node 22 ; `kit-tests` : Node 24, suite du paquet seule.

### le gain de CI atteint-il les projets adoptés ? (ex-« ci-livree-aux-projets-non-mis-a-jour »)

**Existant (relevé le 2026-10-24)** :

- Gabarit des hooks : moteur à jour ; gabarit du workflow : inchangé par le chantier.

### un échec non expliqué de QUA-004 au pre-push (ex-« alea-couverture-qua-004-au-pre-push »)

**Existant (relevé le 2026-10-24)** :

- Un échec isolé, non reproduit ; le contrôle passe seul et au second push.

### un budget de temps des contrôles calibré pour les machines Windows de la CI (ex-« budget-temps-windows »)

**Existant (vérifié le 2026-10-17)** :

Mesures `[budget-commit]` lues dans les journaux de CI :

- PR #137 (avant le chantier) : Linux 258 et 284 ms, macOS 405 et 580 ms,
  Windows 644 et 973 ms.
- PR #138 : Linux 262 et 270 ms, macOS 344 et 350 ms, Windows 1113, 1897
  puis 1009 ms (relance).
- Le glossaire ajouté par ce chantier coûte 2 à 6 ms dans un projet
  équipé (mesuré en local) : il n'explique pas l'écart.
- Commentaire du test : « Marge large pour le bruit des machines de CI
  partagées ; ne se relève que sur décision (cliquet). »

### éprouver les gardes de lecture et le sous-agent dans une vraie session Claude Code (ex-« gardes-de-lecture-en-session-reelle »)

**Existant (relevé le 2026-10-24)** :

- Le refus de `cat` est jugé sur le texte de la commande
  (`docs/intentions/contournements-restants.md`).
- Faux positif constaté à la clôture : `cat >> docs/projects/journal.md <<EOF`
  (ajout en fin de fichier, une écriture) est refusé comme une lecture.
- Le banc des agents (QUA-060, un outil n'est tenu que prouvé par le banc) sait lancer une vraie session.

### découper le registre des contrats et le journal (ex-« decoupage-registre-et-journal »)

**Existant (relevé le 2026-10-24)** :

- Un fichier par registre ; le catalogue, `check-docs`, `.githooks/glossary.mjs`,
  `.githooks/close.mjs` et `.githooks/doc-coherence.mjs` les lisent.

### documenter l'avertissement émis par un contrôle (`[ia-first-warning]`) dans son contrat (ex-« tests-de-timing-instables »)

**Existant (relevé le 2026-10-26)** :

- `.githooks/run-checks.mjs` (et son gabarit) reprend les lignes `[ia-first-warning] <texte>` de la sortie d'un contrôle ; test ciblé « QUA-127 » dans `.githooks/run-checks.test.mjs`.
- Le test « budget de temps » de `packages/drwil/test/kit.test.mjs` l'émet au dépassement de 1500 ms.

### les chantiers vont-ils plus vite ? un journal des passes locales

**Existant (relevé le 2026-10-26)** :

- `.drwil/evidence/run-checks-verdicts.json` (si présent) et
  `.drwil/evidence/pre-push-verdicts.json` (si présent) : verdict et durée de chaque
  contrôle de la dernière passe seulement, écrasés à la suivante.
- `.drwil/evidence/run-checks.log` (si présent) : détail de la dernière passe (repris,
  rejoués, durées), écrasé lui aussi.
- `.drwil/evidence/verify-*.json` : une preuve horodatée par passe de
  `verify --evidence`, avec la durée et le drapeau `replayed` de chaque
  contrôle depuis la 0.9.0 ; rien pour le pre-commit ni le pre-push.
- `.drwil/usage.jsonl` : durée et tokens par chantier, sans le temps passé
  dans les contrôles.

## Questions à trancher

- [décision] Découper ce regroupement en lots, chacun vérifiable seul, et choisir le premier.

### suivre la durée de la CI comme un indicateur, pas comme un contrat attesté (ex-« objectifs-de-duree-ci-en-indicateur »)

Décisions du demandeur le 2026-10-25, réalisées (journal « la durée du job
`checks` devient un indicateur ») : relevé manuel par chantier au journal,
référence de CI et distinction hooks modifiés/inchangés ; QUA-122 (durée du
job `checks`) conservé comme preuve historique.

- [décision] Dans un chantier ultérieur : comment le tableau de bord
  montre-t-il la tendance et quel seuil d'alerte non bloquant appliquer ?
  Ni tableau de bord ni seuil nouveau dans la fiche cadrée.

### relever la durée du job `checks` quand les hooks sont inchangés (ex-« releve-duree-checks-hooks-inchanges »)

- Relever la durée du job `checks` sur la première PR ordinaire (hooks et
  `.drwil/ia-first.json` inchangés) après la fusion, la consigner au journal,
  puis supprimer cette fiche.

### relever le cache lu moyen par requête après la réduction du contexte (ex-« releve-cache-lu-par-requete »)

- Relever avec `node .githooks/consumption.mjs --recorded` le cache lu moyen
  par requête sur deux chantiers comparables (taille, risque HIGH, nombre de
  requêtes du même ordre) clos après celui-ci ; le comparer aux ≈ 170 k ; le
  consigner au journal, puis supprimer cette fiche.
- Quels chantiers comptent comme « comparables » : à trancher par le
  demandeur au moment du relevé.

### `checks-self-test` double-t-il `couverture-hooks` ? (ex-« checks-self-test-contre-couverture-hooks »)

- [décision] Prouver (mêmes fichiers, même verdict, même contrat nommé) puis
  retirer l'un des deux, ou garder les deux ?

### jouer aussi les tests de `.githooks/` sur Node 24 (ex-« tests-des-hooks-sur-node-24 »)

- [décision] Accepter ce recul (les hooks sont aussi exercés sur Node 24 par la
  suite du paquet) ou ajouter `node --test .githooks/*.test.mjs` à `kit-tests`
  (nécessite d'élargir le test de structure de `ci-multi-os`) ?

### le gain de CI atteint-il les projets adoptés ? (ex-« ci-livree-aux-projets-non-mis-a-jour »)

- [décision] `drwil update` / `doctor` propose-t-il `parallel` et `build` aux
  projets existants ? Le workflow livré évite-t-il le doublon push / PR ?

### un échec non expliqué de QUA-004 au pre-push (ex-« alea-couverture-qua-004-au-pre-push »)

- Reproduire sous charge (`taskset`, plusieurs passages), lire la sortie du
  contrôle en échec et trancher : test à rendre robuste, ou parallélisme à
  réduire.

### un budget de temps des contrôles calibré pour les machines Windows de la CI (ex-« budget-temps-windows »)

- [tranché] Un budget par système (Windows plus large), une médiane de
  plusieurs mesures, ou un budget inchangé avec relance automatique du
  test en cas de dépassement ?
- [décision] Le relever reste-t-il une décision humaine (cliquet), comme
  le dit le test ?

### éprouver les gardes de lecture et le sous-agent dans une vraie session Claude Code (ex-« gardes-de-lecture-en-session-reelle »)

- Ajouter au banc un scénario « lire le registre en entier » (refus attendu,
  renvoi vers `.githooks/glossary.mjs`) et un passage par le sous-agent ?
- Laisser passer `cat` quand le fichier gardé n'est que la cible d'une
  redirection (`>`, `>>`) ?

### découper le registre des contrats et le journal (ex-« decoupage-registre-et-journal »)

- Découper seulement si le relevé de l'indicateur
  (`docs/intentions/suivi-ci-et-contexte.md`) montre que la lecture
  ciblée ne suffit pas ?
- Forme : un fichier par contrat, par année de journal, ou archive des
  entrées anciennes ? Change le format lu par les contrôles et le catalogue :
  migration pour les projets adoptés.

### documenter l'avertissement émis par un contrôle (`[ia-first-warning]`) dans son contrat (ex-« tests-de-timing-instables »)

- [décision] Compléter le texte de QUA-127 (et sa preuve : le test ciblé de `.githooks/run-checks.test.mjs`) plutôt que créer un contrat : modifier un contrat existant est une décision du demandeur.
- Les autres tests qui mesurent une durée, recensés au journal (`.githooks/engine.test.mjs`, `outils/banc*.test.mjs`, rendez-vous de QUA-139), sont conservés avec justification ; les passer en indicateur est possible par le même mécanisme, si une instabilité s'y révèle.

### les chantiers vont-ils plus vite ? un journal des passes locales

- [décision] Où vit le journal : un fichier ajouté à chaque passe dans
  `.drwil/evidence/` (ignoré par git, local à la machine), ou une colonne
  « temps des contrôles » dans `.drwil/usage.jsonl` à la clôture ?
- [décision] Pourquoi `verify --evidence` ne reprend jamais un verdict de
  `run-checks` : arbre modifié entre les deux passes, ou empreinte qui ne
  correspond pas ? À établir avant de toucher au code.
- Livré aux projets adoptés, ou propre à ce dépôt ?
