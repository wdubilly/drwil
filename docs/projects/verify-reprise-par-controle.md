# Projet : `run-checks` et `drwil verify` reprennent un verdict contrôle par contrôle, pour les itérations

**Statut** : cadré le 2026-10-25.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/suivi-ci-et-contexte.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - packages/drwil/src/verify.ts
  - packages/drwil/src/evidence.ts
  - packages/drwil/src/agent.ts
  - packages/drwil/bin/drwil.js
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/suivi-ci-et-contexte.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Depuis QUA-140 (`verify` reprend le verdict de `run-checks` sur un arbre
identique), un `verify` qui suit un `run-checks` prend ≈ 2 s au lieu de
≈ 2 min. Mais l'empreinte porte sur **tout l'arbre** : un octet changé
n'importe où (fiche, journal, un fichier sans rapport avec le contrôle)
invalide **tous** les verdicts. Pendant les itérations (corriger, relancer
`run-checks`, relancer `verify`), le gain est donc nul dès qu'on touche
quoi que ce soit entre les deux ; surtout, `run-checks`, qui fait le gros du
temps d'une itération, rejoue toujours tout. Il faut qu'un verdict soit
repris, par `run-checks` comme par `verify`, tant que les fichiers **que ce
contrôle juge** n'ont pas changé, sans que la preuve de clôture y perde en
rigueur.

## Critères d'acceptation

(le contrat voisin de `QUA-140` est à créer au lancement, avec son champ
**Origine** ; ID à attribuer à ce moment-là dans le registre.)

- Un `run-checks` lancé hors hook et hors CI ne rejoue que les contrôles
  « ok » dont les fichiers du `paths` ou la déclaration ont changé, et le
  dit (« repris », « rejoué ») ; un contrôle en échec, sans verdict ou sans
  `paths` est rejoué ; une option le force à tout rejouer — contrat à créer
- Un `verify` hors preuve de clôture reprend le verdict d'un contrôle de
  `run-checks` quand les fichiers de son `paths` et sa déclaration sont
  identiques à l'octet près, même si l'arbre a changé ailleurs ; il rejoue
  le contrôle sinon — contrat à créer
- Un contrôle sans `paths` garde l'empreinte de tout l'arbre, et la preuve
  de clôture (`verify --evidence`) aussi : aucun verdict de clôture n'est
  repris par contrôle — contrat à créer
- La preuve et la sortie disent, contrôle par contrôle, « repris (fichiers
  du contrôle inchangés) », « repris (arbre identique) » ou « rejoué » —
  contrat à créer
- Un contrôle repris a bien tourné : QUA-013 le dit — `QUA-013`

## 2. Hors périmètre

- Rejouer d'abord les seuls échecs : `docs/projects/verify-rejoue-les-echecs.md`.
- Changer la règle de VERIFY : clore exige toujours une passe complète
  `verify --evidence` en PASS ou ATTESTED, sur l'arbre entier.

## 3. Contraintes

- Réutilise le champ `paths` déjà déclaré par contrôle dans
  `.drwil/ia-first.json` (déjà utilisé par le moteur pour différer un
  contrôle au pre-commit) : pas un second champ.
- Le risque propre à ce chantier : un contrôle qui lit un fichier absent de
  ses `paths` serait repris à tort. Le lot 1 audite d'abord chaque contrôle
  déclaré (lecture de l'historique Git, de la branche, de l'état local, de
  fichiers hors `paths`) ; un contrôle qui en lit reste sur l'empreinte de
  tout l'arbre (soit en retirant son `paths`, soit par une déclaration
  explicite).
- Ne sert pas la preuve de clôture (décision 1) : c'est ce qui borne le
  risque ci-dessus à l'itération. Invariant : seul un contrôle réellement
  joué dans la passe entre dans l'empreinte de l'arbre entier de QUA-140 ;
  un verdict que `run-checks` a repris porte seulement son empreinte de
  contrôle, donc `verify --evidence` le rejoue. Chemin rapide de la
  clôture : `run-checks` avec l'option « tout rejouer », puis
  `verify --evidence` qui reprend (QUA-140).
- QUA-013 (un contrôle non exécuté n'est pas passé) : un verdict repris a
  tourné sur les mêmes fichiers que ceux que le contrôle juge.
- Livré à tout projet (gabarit des hooks et `verify`), et propre à ce dépôt
  pour les `paths` de son `.drwil/ia-first.json` (QUA-018).

## 4. Décisions

(validées par le demandeur le 2026-10-25)

1. **Clôture** : `verify --evidence` (preuve de clôture) garde l'empreinte
   de tout l'arbre ; la reprise par contrôle ne sert qu'aux itérations.
2. **Entrées de chaque contrôle** : le `paths` déjà déclaré ; sans `paths`,
   empreinte de tout l'arbre (comportement actuel de QUA-140).
3. **Qui en profite** : `verify` et `run-checks` (tranché le 2026-10-25, en
   revenant sur « `verify` seul » : sans `run-checks`, le gain en itération
   est marginal). Hooks (pre-commit, pre-push) et CI rejouent toujours
   tout : la barrière ne change pas.
4. **Contrat** : un contrat voisin de `QUA-140`, qui le laisse intact
   (`QUA-140` garde l'arbre entier, la preuve de clôture en dépend).
5. **Verdict** : une passe à reprise par contrôle reste
   `GOVERNANCE: PASS`, avec la mention « reprise par contrôle : ne vaut pas
   preuve de clôture » ; la clôture exige toujours la passe `--evidence`
   sur l'arbre entier.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — audit des `paths`** [IA] : pour chaque contrôle déclaré dans
  `.drwil/ia-first.json`, lister ce qu'il lit réellement ; corriger les
  `paths` incomplets, ou laisser sans `paths` ceux qui lisent l'historique,
  la branche ou l'état. Critère de sortie : un test fait échouer un contrôle
  dont le `paths` omet un fichier qu'il lit.
- **Lot 2 — empreinte par contrôle** [IA] : le moteur calcule l'empreinte
  des fichiers du `paths` (suivis et non suivis non ignorés) plus la
  déclaration du contrôle ; `run-checks` la consigne avec chaque verdict ;
  tests de l'empreinte (stable, changée par un octet d'un fichier du
  `paths`, inchangée par un fichier hors `paths`).
- **Lot 3 — reprise dans `run-checks`** [IA] : hors hook et hors CI, un
  contrôle « ok » d'empreinte inchangée n'est pas rejoué et la sortie le
  dit ; échec, verdict absent, sans `paths` ou `reuse: false` : rejoué ;
  option « tout rejouer » ; un verdict repris ne reçoit pas l'empreinte de
  l'arbre entier (invariant de la section 3) ; tests. C'est le lot qui
  porte le gain.
- **Lot 4 — reprise dans `verify`** [IA] : reprise par contrôle hors preuve
  de clôture, preuve et sortie qui disent la raison contrôle par contrôle,
  `--evidence` inchangé (arbre entier), contrat au registre et contrôle
  `tests-qua-<id>`, README, ligne « Unreleased » du changelog, mesure au
  journal. Critère de sortie : `node .githooks/run-checks.mjs` OK,
  `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-25) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
