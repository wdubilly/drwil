# Intention : un catalogue de contrats couvrant le cycle de vie logiciel

**Statut** (2026-10-11) : à cadrer — intention posée par le demandeur ;
décisions de principe prises, questions 1 à 5 et 7 à trancher en fin de
fiche.

**Projet** : DRWIL — **Niveau de risque** : HIGH (change la source de
vérité des contrats, le moteur de vérification et le livrable).

Lecture : chaque section dit si elle porte des **faits vérifiés** (relus
dans le dépôt le 2026-10-11, source citée), des **décisions prises**
(datées, par le demandeur) ou des **propositions** (de l'agent, à
arbitrer). Une proposition n'engage rien tant qu'elle n'est pas devenue
une décision.

Notation : les identifiants du catalogue proposé (« Catalogue des contrats
de gouvernance logicielle », version 1.0, soumis le 2026-10-11) sont
préfixés `v1:` (ex. v1:SEC-002). Sans ce préfixe, un identifiant désigne
un contrat du registre actuel, `docs/contrats.md`. Les deux espaces se
chevauchent (v1:SEC-001 n'est pas SEC-001) : le préfixe évite toute
confusion, y compris pour le contrôle des références (QUA-011, doc jamais
fausse).

## Besoin

Le demandeur a soumis un catalogue de 211 contrats candidats en
19 domaines (GOV, REQ, ARC, COD, TST, SEC, DAT, DEP, DOC, GIT, REL, OPS,
PKG, INI, CTR, HOOK, TMA, IP, X), trois profils (DOGFOODING,
CLIENT-STANDARD, CLIENT-RENFORCE), un schéma machine de 18 champs et une
politique d'application. Intention : couvrir tout le cycle de vie
logiciel, chaque exigence ayant **un contrôle en face** — automatique,
humain ou mixte — sans jamais faire passer une absence de vérification
pour une conformité.

Chaque contrat devra être complété (priorité, mode de contrôle,
applicabilité, mécanisme de vérification) avant de devenir exécutable.

## Décisions prises (demandeur, 2026-10-11)

- **Périmètre (QUA-018, dépôt drwil vs livrable gabarit)** : les deux.
  Ordre : catalogue client (livrable) d'abord, puis profil DOGFOODING
  (ce dépôt), puis intégration et tests du paquet npm.
- **Source de vérité** : JSON canonique, validé par un schéma JSON
  versionné (champs obligatoires, valeurs autorisées, règles de
  validation). Le Markdown est une vue **générée**, de façon
  déterministe (même JSON, même sortie), avec contrôle de cohérence en
  CI.
- **Divergence bloquante** : la CI échoue si le Markdown commité diffère
  du Markdown régénéré depuis le JSON (tranche la question 6).
- **Identifiants** : les identifiants historiques sont conservés, jamais
  réaffectés. Une table de correspondance explicite relie registre et
  catalogue, établie sur le **contenu et l'historique**, pas sur le
  préfixe ; une correspondance que les sources n'établissent pas reste
  « aucune », jamais inventée.
- **QUA-018 (périmètre explicite : dépôt drwil vs livrable gabarit)** :
  règle locale du profil DOGFOODING, sans équivalent au socle ; elle
  garde son identifiant et n'est jamais confondue avec un contrat du
  catalogue (tranche la question 8).
- **Mode de travail** : le demandeur déclare le projet en FULL AUTO pour
  le cadrage documentaire (rédaction, analyse, consignation) sans
  validation intermédiaire. FULL AUTO n'abolit pas les étapes qui
  conditionnent l'implémentation : critères de sortie ci-dessous, fiche
  cadrée et lancement. Fait vérifié le même jour : le réglage
  `transitions` de `.drwil/ia-first.json` vaut `humain` ; le lancement
  d'un chantier reste donc un geste humain tant que ce réglage n'est pas
  changé (changement qui serait lui-même un chantier).

## Existant (faits vérifiés le 2026-10-11)

### Registre actuel

`docs/contrats.md`, forme sections (ADR-001 de
`docs/projets/drwil-v0-2-gouvernance-executable.md` : ce fichier est
aujourd'hui la source canonique) : 11 contrats — SEC-001, SEC-006,
SEC-007, QUA-004, QUA-011, QUA-013, QUA-015, QUA-016, QUA-017, QUA-018,
QUA-019. Champs lus par `.githooks/contrats.mjs` : Règle, Contrôle,
Manuel, Sévérité.

- **Statuts produits par `drwil verify`** : PASS, FAIL, ERROR, MANUAL,
  ATTESTED (attestation humaine par `drwil attest`, empreinte du
  contrat). Un contrôle non exécuté donne ERROR, jamais PASS (test
  « verify : outil indisponible (contrôle non exécuté) → ERROR, jamais
  PASS » de `packages/drwil/test/kit.test.mjs`). Le moteur
  (`.githooks/moteur.mjs`) distingue en interne ok, echec, non-execute
  et non-applicable.
- **Sévérités** : bloquant, avertissement, indicatif (DRWIL-020,
  `SEVERITES` dans `.githooks/contrats.mjs`) ; seuls les contrats
  bloquants décident du verdict de `verify`.
- **Catalogue existant** : `docs/catalogue-contrats.md`, 15 contrats
  préfixés `catalogue:` (non installés, adoptés un par un).

### QUA-018 (vérifié pour établir sa correspondance)

Introduit le 2026-10-05 par le commit `1b5e9a9` (« docs: contrat
QUA-018, distinguer drwil-le-dépôt de drwil-le-livrable »), dans
`docs/contrats.md`. Règle : ce dépôt a deux casquettes, le dépôt et le
livrable ; si une demande ne précise pas laquelle est visée, l'IA le
demande avant d'agir. Preuve humaine (Manuel : appréciation
contextuelle). Raison : un changement fuyait du dépôt vers le gabarit
(job CI de release). Absent du gabarit : jamais livré aux clients.

### Mécanismes en place utiles au catalogue

- Hooks : pre-commit, pre-push et CI rejouent les mêmes contrôles par un
  moteur unique (ADR-003) ; report des contrôles hors de leurs chemins au
  seul pre-commit ; budget de temps au commit d'un projet équipé
  (1 500 ms, test « budget de temps » du kit).
- `drwil verify --json` (format stable, DRWIL-004), `drwil doctor`
  (DRWIL-010), aperçu d'`apply` sans écriture (DRWIL-011), manifeste des
  fichiers installés avec sha256, détection de dérive, `uninstall` en
  simulation par défaut (fichier modifié conservé).
- Forge de **ce dépôt** (`.github/ruleset-master.json`, vérifié en CI) :
  checks `checks` et `kit-tests` (3 OS) exigés, aucun contournement,
  suppression et réécriture d'historique interdites. **Mais** :
  0 approbation exigée et revue des CODEOWNERS non imposée
  (`require_code_owner_review: false`) ; `.github/CODEOWNERS` existe
  sans être obligatoire.
- Couverture : QUA-004 (`couverture-tests`, `couverture-hooks`), hooks à
  100 % avec seuil bloquant depuis le 2026-10-11.
- **Absents** : aucun lint ni formateur déclaré ; aucun audit de
  dépendances (SEC-006 le dit : « écart à outiller ») ; aucun champ
  `engines` dans `packages/drwil/package.json` ; aucune porte avant
  `npm publish` (seul `prepack` lance le build) ; la publication npm
  elle-même reste à décider (`docs/intentions/packager-kit-ia-first.md`).

## Correspondance du registre actuel (proposition, établie sur le contenu)

| Registre | Sens réel | Correspondance v1 | Nature |
|---|---|---|---|
| SEC-001 | Droits d'accès décidés par le backend | v1:SEC-004 (moindre privilège) | proche, non équivalent ; **collision d'ID** avec v1:SEC-001 (modèle de menace) |
| SEC-006 | Aucune dépendance vulnérable connue | v1:SEC-008 | équivalent sur l'objet ; non outillé ici (MANUAL) |
| SEC-007 | Pas de secret dans le dépôt | v1:SEC-002 | équivalent ; v1:GIT-006 est plus large |
| QUA-004 | Seuil de couverture par périmètre | v1:TST-005 | équivalent |
| QUA-011 | Chemins et ID cités existent | v1:DOC-010 | proche : QUA-011 vérifie les références, v1:DOC-010 vise des exemples testés |
| QUA-013 | Contrôle non exécuté ≠ passé | v1:CTR-006 | équivalent ; v1:HOOK-012 et v1:X-001 proches |
| QUA-015 | Chantiers exploitables à froid | aucune | règle locale (méthode drwil) |
| QUA-016 | Code couvert par le cadrage d'une fiche | v1:GOV-006, v1:GIT-008 | proche : traçabilité changement → demande, sur le seul code |
| QUA-017 | Pas de travail direct sur la branche principale | aucune | proche de v1:GIT-003 sans l'égaler (local vs forge) |
| QUA-018 | Demander la casquette visée (dépôt / livrable) | aucune | **règle locale du profil DOGFOODING** (décidé le 2026-10-11) ; v1:GOV-001 documente un périmètre, QUA-018 impose une question avant d'agir |
| QUA-019 | Pas de contournement d'un contrôle | aucune | proche de v1:HOOK-009 et v1:X-007, sans les égaler |

## Doublons du catalogue proposé (proposition)

Trois natures, à arbitrer paire par paire.

**Identiques** (même obligation, même objet) — à fusionner, un seul ID
gardé :

- v1:INI-005 = v1:X-005 (modifications client préservées par défaut ;
  aussi point 9 de la politique d'application).
- v1:CTR-009 = v1:X-007 (exceptions documentées et approuvées).
- v1:CTR-014 = v1:X-002 (origine de la règle traçable).
- v1:TST-004 = v1:TMA-004 (correction accompagnée d'un test).
- v1:PKG-008 = v1:TMA-006 (changement incompatible identifié et
  documenté).
- v1:HOOK-014 = v1:X-006 (règles bloquantes imposées par la plateforme
  lorsque possible).

**Inclusions** (l'un contient l'autre) — garder le plus large ou
découper :

- v1:GIT-006 ⊃ v1:SEC-002 (secrets, plus les artefacts temporaires).
- v1:CTR-012 ⊃ v1:X-008 (v1:X-008 omet le catalogue).
- v1:GOV-003 ⊃ v1:ARC-005 (décisions, dont celles d'architecture).
- v1:GOV-007 ⊃ v1:CTR-009 (ajoute approbateur et échéance).
- v1:GOV-010 ⊃ v1:TMA-010 (v1:TMA-010 limité aux incidents importants).
- v1:INI-015 ⊃ v1:INI-007 (simulation de tout changement vs aperçu des
  seuls changements sensibles).
- v1:SEC-011 ⊃ la moitié « secrets » de v1:COD-007.
- v1:X-003 renforce v1:CTR-011 (test positif **et** négatif exigé).

**Proches mais non équivalents** — à garder distincts, en précisant la
frontière :

- v1:CTR-006 (absence de vérification), v1:X-001 (vérification
  insuffisante), v1:HOOK-012 (erreur ≠ conformité), v1:X-004
  (erreur ≠ violation).
- v1:GIT-005 (avant fusion), v1:REL-003 (avant livraison), v1:HOOK-002
  (où : CI protégée) : trois portes différentes.
- v1:GIT-003 (protection de branche) et v1:HOOK-014.
- v1:COD-010 (toute revue soumise) et v1:GIT-004 (changements
  sensibles).
- v1:GOV-006, v1:REQ-004, v1:GIT-008 (traçabilité à trois grains :
  exigence → livrable, exigence → test, changement → demande).
- v1:GOV-005 (valider un changement de périmètre) et v1:REQ-007
  (historiser un changement d'exigence).
- v1:ARC-001 et v1:DOC-005 (architecture documentée : conception vs
  maintenance).
- v1:REL-005 (notes de version) et v1:DOC-008 (changelog).
- v1:REL-007 (artefact = version validée) et v1:PKG-010 (artefact testé
  avant diffusion).
- v1:HOOK-005, v1:PKG-006, v1:PKG-012 (codes de sortie : contrôles vs
  CLI, documentation vs cohérence).
- v1:PKG-001, v1:PKG-015, v1:TST-009, v1:DEP-008 (portabilité : Node,
  OS, tests, installation).
- v1:INI-001 et v1:INI-005 ; v1:INI-008 et v1:INI-009 ; v1:INI-010 et
  v1:HOOK-008.
- v1:OPS-008 et v1:TMA-002 (anomalies priorisées).
- v1:DEP-004 (licences contrôlées) et v1:IP-002 (licences respectées,
  engagement juridique).
- v1:ARC-010 (réversibilité technique) et v1:IP-007 (réversibilité
  contractuelle).
- v1:REQ-008, v1:IP-005, v1:IP-009, v1:TST-012 (critères d'acceptation
  et acceptation formelle).
- v1:CTR-008 (historique) et v1:X-009 (non-régression du catalogue).
- v1:X-010 (limites des contrôles) et v1:DOC-006 (limites du produit).

Effet : la fusion des six identiques ramène le catalogue à 205 contrats,
environ 197 si les inclusions sont fusionnées. Correction : l'estimation
d'« environ 130 » donnée oralement le 2026-10-11 était fausse ; le
volume vient du nombre de domaines, pas des doublons.

## Classement des contrôles (proposition)

Règle de classement : **un contrôle partiellement automatisé est classé
PARTIEL**, jamais AUTO ; la part humaine restante est nommée.

### Déjà tenus (mécanisme existant vérifié)

| Contrat v1 | Mécanisme | Mode réel | Portée |
|---|---|---|---|
| v1:CTR-006, v1:HOOK-012 | QUA-013 ; moteur (non-execute) ; `verify` (ERROR) | AUTO | livrable et dépôt |
| v1:SEC-002 | SEC-007, contrôle `secrets-fichiers` (gitleaks) | AUTO, dégradable : sans gitleaks local, non exécuté, la CI rattrape | livrable et dépôt |
| v1:TST-005 | QUA-004 | AUTO | dépôt |
| v1:CTR-001 | doublons d'ID refusés (`.githooks/check-docs.mjs`, `.githooks/contrats.mjs`) | AUTO | livrable et dépôt |
| v1:CTR-004, v1:CTR-005 | Contrôle ou Manuel exigé (`validerContrats`) | PARTIEL : présence vérifiée, pertinence humaine | livrable et dépôt |
| v1:CTR-002 | Règle exigée | PARTIEL : présence vérifiée, mesurabilité humaine | livrable et dépôt |
| v1:CTR-007 | évidence de `verify --evidence` liée au commit | AUTO | livrable et dépôt |
| v1:CTR-010 | sévérité DRWIL-020 validée | AUTO | livrable et dépôt |
| v1:CTR-011, v1:X-003 | tests des hooks, 100 %, seuil | PARTIEL : couverture prouvée, « test négatif par contrôle » non vérifié | dépôt |
| v1:HOOK-001, v1:HOOK-003, v1:HOOK-004, v1:HOOK-005, v1:HOOK-007, v1:HOOK-009, v1:HOOK-010, v1:HOOK-011 | pre-commit, moteur unique, report par chemins, codes 0/1/2, `doctor`, rejeu pre-push et CI, `verify --json`, budget 1 500 ms | AUTO | livrable et dépôt |
| v1:GIT-003, v1:HOOK-014, v1:GIT-005 | ruleset versionné et vérifié en CI | AUTO | **dépôt seulement** (`docs/intentions/forge-dans-le-livrable.md`) |
| v1:INI-004, v1:INI-005, v1:INI-006, v1:INI-007, v1:INI-014, v1:INI-015 | dérive (sha256), `apply` sans écrasement, manifeste, aperçu, `uninstall` simulé | AUTO | livrable |
| v1:INI-001 | `init` relancé réécrit `.githooks/` | PARTIEL : écrasement des hooks volontaire et documenté, le reste préservé | livrable |
| v1:PKG-015 | matrice CI Linux, Windows, macOS | AUTO | dépôt |
| v1:PKG-004 | test « aucun fichier du gabarit n'est retiré par npm » | PARTIEL : rien ne manque, mais « uniquement les fichiers attendus » non vérifié | dépôt |
| v1:REL-002, v1:REL-004 | module de release : version unique, refus d'un recul | AUTO, module optionnel | livrable (opt-in) |
| v1:DEP-002 | `npm ci` en CI (échoue si verrou et manifeste divergent) | AUTO | dépôt |
| v1:DOC-010 | QUA-011 (références existantes) | PARTIEL : exemples non exécutés | livrable et dépôt |
| v1:GOV-006, v1:GIT-008 | QUA-016, trailer `Drwil-Attente` | PARTIEL : code → fiche tracé, exigence → test non | livrable et dépôt |

**Non tenus malgré l'apparence** : v1:GIT-004 et v1:COD-010 (CODEOWNERS
présent, revue non exigée) ; v1:SEC-008 (SEC-006 existe mais MANUAL,
aucun audit outillé).

### Automatisables (à outiller, coût faible à moyen)

AUTO complet possible :

- v1:SEC-008 (audit des dépendances avec seuil ; ferme l'écart de
  SEC-006).
- v1:DEP-004 (licences contre une liste blanche ; voir
  `catalogue:SEC-012`).
- v1:PKG-001 (champ `engines` et matrice de versions de Node).
- v1:PKG-004 complet (`npm pack --dry-run` comparé à une liste
  attendue).
- v1:PKG-005 (installation depuis le tarball dans un projet vierge,
  commandes de base).
- v1:INI-002, v1:INI-003 (deux `init` ou `apply` successifs : diff vide).
- v1:INI-008, v1:INI-009 (chemins hors cible, liens symboliques,
  traversées : tests dédiés).
- v1:HOOK-013 (porte avant publication : voir question 3).
- v1:COD-002, v1:COD-003 (formateur et lint : absents aujourd'hui).
- v1:GIT-002 (convention de commit, si une convention est retenue).

PARTIEL (automatique + jugement humain nommé) :

- v1:TST-004 : lien défaut → test vérifiable ; « important » est humain
  (`docs/intentions/non-regression-continue.md`).
- v1:COD-004, v1:COD-008, v1:COD-011 : mesure automatique ; exceptions
  et justifications humaines.
- v1:SEC-011, v1:COD-007 : recherche de motifs connus ; exhaustivité
  humaine.
- v1:REQ-001, v1:REQ-004 : ID stables et liens vérifiables ; pertinence
  humaine.
- v1:REL-007 : empreinte du tarball publié contre l'artefact validé ;
  validation humaine de la version.

### Processus humains (HUMAIN, attestés)

Tout v1:GOV sauf v1:GOV-006 (partiel) ; v1:REQ-003, v1:REQ-005,
v1:REQ-006 ; v1:ARC-002 à v1:ARC-010 ; v1:SEC-001, v1:SEC-003,
v1:SEC-012 ; tout v1:DAT et v1:IP ; v1:TMA-001 à v1:TMA-003,
v1:TMA-009 ; v1:DOC-006, v1:DOC-009. Le dépôt ne peut au mieux qu'en vérifier la
**trace** (document présent, attestation signée), jamais le fond :
présentés comme tels, jamais comme AUTO.

### Hors de portée du dépôt

v1:OPS-001 à v1:OPS-007, v1:DAT-007 et v1:DAT-008 (sauvegarde et
restauration réelles), v1:REL-010 (après déploiement) : ils relèvent de l'exécution, pas
du code. drwil peut exiger une procédure documentée (PARTIEL au mieux)
et doit le déclarer (v1:X-010).

## Questions à trancher

1. **Statuts : NOT_VERIFIED face à MANUAL et ATTESTED.**
   - A. Garder les statuts de drwil ; NOT_VERIFIED du catalogue devient
     MANUAL (en attente d'un humain) ou ERROR (contrôle impossible).
     Conséquence : aucune rupture de `verify --json` (DRWIL-004) ; deux
     vocabulaires à documenter.
   - B. Adopter les cinq statuts du catalogue et ajouter ATTESTED.
     Conséquence : rupture du format JSON (version du schéma montée,
     migration des intégrations) ; NOT_VERIFIED mélange « humain
     attendu » et « outil absent », que drwil distingue aujourd'hui.
   - C. Union versionnée : PASS, FAIL, ERROR, MANUAL, ATTESTED,
     NOT_APPLICABLE ; NOT_VERIFIED réservé au rapport. Conséquence :
     schéma versionné, compatibilité ascendante possible.
2. **Sévérité et applicabilité séparées.**
   - A. Sévérité : bloquant, avertissement, indicatif (DRWIL-020) ;
     applicabilité dans un champ distinct (profil, pile détectée,
     chemins). CONDITIONNEL disparaît ; MAJEUR correspond à
     avertissement, MINEUR à indicatif. Conséquence : aucun changement
     du moteur pour la sévérité.
   - B. BLOQUANT, MAJEUR, MINEUR plus applicabilité. Conséquence :
     MAJEUR (« dans le délai convenu ») exige un champ d'échéance et un
     mécanisme (avertissement qui devient bloquant à la date) : nouveau
     comportement à concevoir et à tester.
   - C. Les quatre niveaux tels quels. Conséquence : deux axes mêlés,
     un contrat CONDITIONNEL n'a pas de sévérité une fois actif.
3. **Porte avant `npm publish`** (dépend de la décision de publication,
   `docs/intentions/packager-kit-ia-first.md`).
   - A. Script `prepublishOnly` qui lance tests et `verify`.
     Conséquence : simple, mais contournable (`--ignore-scripts`) et
     local.
   - B. Publication seulement depuis la CI, sur tag, environnement
     protégé et approbation humaine, avec provenance npm. Conséquence :
     robuste et traçable ; demande un secret npm, un environnement
     GitHub et la protection de la forge.
   - C. A et B : A comme filet local, B comme seule autorité.
     Conséquence : coût de B, plus un retour rapide en local.
4. **Le registre client face au JSON.** Aujourd'hui un projet adopte un
   contrat en recopiant une ligne dans `docs/contrats.md`
   (`docs/recettes/adopter-le-kit.md`). JSON canonique : le client
   édite-t-il le JSON (commande `drwil` d'adoption) ou garde-t-il un
   Markdown local, régénéré ? Conséquence directe sur l'expérience
   d'adoption et sur le principe « une information, une seule source ».
5. **Collisions d'ID** : v1:SEC-001 (modèle de menace), v1:SEC-006
   (injection) et v1:SEC-007 (chiffrement) n'ont pas le sens de SEC-001,
   SEC-006 et SEC-007 du registre. Renuméroter les
   nouveaux (jamais les historiques) ou les espacer par domaine
   (ex. SEC-1xx) ?
6. ~~Phrase interrompue sur la génération du Markdown~~ — tranchée le
   2026-10-11 : divergence bloquante en CI (voir « Décisions prises »).
7. **Doublons** : valider la fusion des six identiques et l'arbitrage de
   chaque inclusion.
8. ~~Correspondance de QUA-018~~ — tranchée le 2026-10-11 : règle locale
   du profil DOGFOODING (voir « Décisions prises »).

## Critères de sortie du cadrage

Aucune implémentation ne commence avant que **tous** soient remplis :

- [ ] [décision] Intention relue et validée explicitement par le
  demandeur (décision datée ajoutée à « Décisions prises »).
- [ ] [décision] Questions 1 à 5 et 7 tranchées, chacune consignée et
  datée (6 et 8 le sont).
- [ ] [décision] Table de correspondance du registre validée contrat par
  contrat.
- [ ] [décision] Périmètre du premier lot fixé (domaines et contrats du
  catalogue client v1) avec un critère de sortie mesurable.
- [ ] [IA] Fiche `docs/projets/` créée, avec bloc `cadrage` (fichiers
  listés), niveau de risque HIGH, section Décisions et contrats
  concernés.
- [ ] [humain] Fiche lancée par le demandeur (`/drwil-lancer`).

## Liens

- `docs/contrats.md` : registre actuel (11 contrats), source canonique
  à ce jour.
- `docs/catalogue-contrats.md` : catalogue existant (15 contrats
  `catalogue:`).
- `docs/intentions/forge-dans-le-livrable.md` : forge (v1:GIT-003,
  v1:HOOK-014) dans le livrable.
- `docs/intentions/non-regression-continue.md` : v1:TST-004.
- `docs/intentions/packager-kit-ia-first.md` : publication npm
  (question 3).
- `docs/projets/journal.md` : couverture des hooks (2026-10-11).
