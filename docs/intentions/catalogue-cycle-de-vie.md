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
un contrat du registre actuel, `docs/contracts.md`. Les deux espaces se
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

`docs/contracts.md`, forme sections (ADR-001 de
`docs/projects/drwil-v0-2-gouvernance-executable.md` : ce fichier est
aujourd'hui la source canonique) : 11 contrats — SEC-001, SEC-006,
SEC-007, QUA-004, QUA-011, QUA-013, QUA-015, QUA-016, QUA-017, QUA-018,
QUA-019. Champs lus par `.githooks/contracts.mjs` : Règle, Contrôle,
Manuel, Sévérité.

- **Statuts produits par `drwil verify`** : PASS, FAIL, ERROR, MANUAL,
  ATTESTED (attestation humaine par `drwil attest`, empreinte du
  contrat). Un contrôle non exécuté donne ERROR, jamais PASS (test
  « verify : outil indisponible (contrôle non exécuté) → ERROR, jamais
  PASS » de `packages/drwil/test/kit.test.mjs`). Le moteur
  (`.githooks/engine.mjs`) distingue en interne ok, echec, non-execute
  et non-applicable.
- **Sévérités** : bloquant, avertissement, indicatif (DRWIL-020,
  `SEVERITES` dans `.githooks/contracts.mjs`) ; seuls les contrats
  bloquants décident du verdict de `verify`.
- **Catalogue existant** : `docs/contracts-catalog.md`, 15 contrats
  préfixés `catalogue:` (non installés, adoptés un par un).

### QUA-018 (vérifié pour établir sa correspondance)

Introduit le 2026-10-05 par le commit `1b5e9a9` (« docs: contrat
QUA-018, distinguer drwil-le-dépôt de drwil-le-livrable »), dans
`docs/contracts.md`. Règle : ce dépôt a deux casquettes, le dépôt et le
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
| v1:CTR-001 | doublons d'ID refusés (`.githooks/check-docs.mjs`, `.githooks/contracts.mjs`) | AUTO | livrable et dépôt |
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
   contrat en recopiant une ligne dans `docs/contracts.md`
   (`docs/recipes/adopt-the-kit.md`). JSON canonique : le client
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
9. **Profils par risque du produit** (ajouté par le demandeur le
   2026-10-11 : « une page HTML n'a pas les mêmes contraintes qu'un
   logiciel bancaire »). Les trois profils (section 20) décrivent surtout
   le *type* de dépôt ; proposition : un axe de **risque du produit** —
   ce que coûte une erreur en production — qui choisit les contrats
   applicables et leur sévérité :
   - **LÉGER** (nouveau) : page statique, prototype, outil interne
     jetable ; socle minimal (v1:SEC secrets, v1:GIT, v1:TST de base),
     le reste en indicatif ;
   - **CLIENT-STANDARD** : application métier courante ;
   - **CLIENT-RENFORCE** : argent, santé, données sensibles, conformité
     (le logiciel bancaire) ;
   - **DOGFOODING** reste à part : il qualifie un dépôt qui produit un
     paquet, et se cumule avec un niveau de risque.
   À trancher : nombre de niveaux, choix du profil (déclaré à `init`,
   questions posées par `drwil`, ou détecté puis confirmé), et le lien
   avec les niveaux de risque des fiches (DRWIL-012), qui notent un
   chantier et non le produit.

## Ordre proposé

Le catalogue n'est pas un chantier unique : il se réalise au fil de la
feuille de route, dont l'ordre vit dans une seule source, l'index
`docs/projects/pending.md` (section « Ordre de réalisation », décidée le
2026-10-11). Chaque chantier y cite les contrats `v1:` qu'il rend réels ;
le **format** du catalogue (JSON, schéma, statuts) et les **profils**
sont en vague 5 (renumérotée le 2026-10-11), avant
toute publication npm, parce qu'il casse une compatibilité ; les contrats
humains (v1:GOV, v1:IP, v1:DAT, v1:OPS) deviennent ensuite des listes de
questions par profil.

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
- [ ] [IA] Fiche `docs/projects/` créée, avec bloc `cadrage` (fichiers
  listés), niveau de risque HIGH, section Décisions et contrats
  concernés.
- [ ] [humain] Fiche lancée par le demandeur (`/drwil-lancer`).

## Liens

- `docs/contracts.md` : registre actuel (11 contrats), source canonique
  à ce jour.
- `docs/contracts-catalog.md` : catalogue existant (15 contrats
  `catalogue:`).
- `docs/intentions/forge-dans-le-livrable.md` : forge (v1:GIT-003,
  v1:HOOK-014) dans le livrable.
- `docs/intentions/non-regression-continue.md` : v1:TST-004.
- `docs/intentions/packager-kit-ia-first.md` : publication npm
  (question 3).
- `docs/projects/journal.md` : couverture des hooks (2026-10-11).

## Annexe — catalogue v1.0 tel que soumis (2026-10-11)

Texte du demandeur, conservé pour qu'il ne vive pas que dans une
conversation. Seule adaptation : chaque identifiant est préfixé `v1:`
(voir « Notation » en tête). Version 1.0, statut « catalogue initial à
valider », périmètre : projet producteur du paquet npm et projets clients
consommateurs. Les identifiants sont proposés ; ils restent stables après
validation. Mode de contrôle et priorité s'attribuent contrat par contrat
avant activation.

**Conventions proposées.** Modes de contrôle : AUTO (automatisable),
HUMAIN (validation humaine requise), MIXTE (contrôle automatique et
validation humaine). Priorités : BLOQUANT (empêche l'étape concernée selon
la politique définie), MAJEUR (correction requise dans le délai convenu),
MINEUR (amélioration ou écart non critique), CONDITIONNEL (activé
uniquement si le contexte le justifie). Statuts d'exécution : PASS,
FAIL, NOT_VERIFIED, NOT_APPLICABLE, ERROR (erreur du mécanisme de
contrôle).

### 1. GOV — Gouvernance et pilotage

| ID | Titre | Règle |
|---|---|---|
| v1:GOV-001 | Objectifs et périmètre | Les objectifs, le périmètre et les exclusions sont documentés. |
| v1:GOV-002 | Responsabilités | Chaque responsabilité critique est attribuée. |
| v1:GOV-003 | Décisions | Les décisions structurantes sont tracées et justifiées. |
| v1:GOV-004 | Gestion des risques | Les risques majeurs disposent d'un responsable et d'un plan de traitement. |
| v1:GOV-005 | Gestion des changements | Les changements de périmètre font l'objet d'une validation définie. |
| v1:GOV-006 | Traçabilité | Les exigences sont reliées aux livrables et aux validations. |
| v1:GOV-007 | Dérogations | Chaque exception possède une justification, un approbateur et, si nécessaire, une échéance. |
| v1:GOV-008 | Indicateurs | Les indicateurs de qualité et de livraison sont définis. |
| v1:GOV-009 | Revues périodiques | Les revues prévues sont réalisées et tracées. |
| v1:GOV-010 | Amélioration continue | Les incidents et retours d'expérience alimentent des actions suivies. |

### 2. REQ — Exigences et gestion du besoin

| ID | Titre | Règle |
|---|---|---|
| v1:REQ-001 | Exigences identifiées | Chaque exigence possède un identifiant stable. |
| v1:REQ-002 | Exigences vérifiables | Les exigences sont formulées avec des critères d'acceptation mesurables lorsque possible. |
| v1:REQ-003 | Priorisation | Les exigences sont priorisées selon leur valeur et leur risque. |
| v1:REQ-004 | Traçabilité des exigences | Les exigences sont reliées aux tests et aux livrables correspondants. |
| v1:REQ-005 | Gestion des ambiguïtés | Les ambiguïtés critiques sont résolues avant implémentation. |
| v1:REQ-006 | Validation métier | Les exigences nécessitant un arbitrage métier sont approuvées. |
| v1:REQ-007 | Gestion des évolutions | Les changements d'exigences sont historisés. |
| v1:REQ-008 | Critères de sortie | Les conditions de validation et de livraison sont définies. |

### 3. ARC — Architecture et conception

| ID | Titre | Règle |
|---|---|---|
| v1:ARC-001 | Architecture documentée | L'architecture est documentée à un niveau adapté au projet. |
| v1:ARC-002 | Responsabilités modulaires | Les modules possèdent des responsabilités identifiables. |
| v1:ARC-003 | Interfaces définies | Les interfaces et leurs contrats sont documentés. |
| v1:ARC-004 | Dépendances maîtrisées | Les dépendances entre modules sont identifiées et contrôlées. |
| v1:ARC-005 | Décisions d'architecture | Les décisions majeures et leurs compromis sont tracés. |
| v1:ARC-006 | Évolutivité | Les contraintes d'évolution sont prises en compte. |
| v1:ARC-007 | Résilience | Les comportements en cas de panne sont définis selon le besoin. |
| v1:ARC-008 | Interopérabilité | Les interfaces externes respectent les formats et protocoles annoncés. |
| v1:ARC-009 | Portabilité | Les dépendances à l'environnement sont explicites. |
| v1:ARC-010 | Réversibilité | Les conditions de migration ou de sortie sont documentées lorsqu'elles sont requises. |

### 4. COD — Code et pratiques de développement

| ID | Titre | Règle |
|---|---|---|
| v1:COD-001 | Conventions de code | Les conventions définies sont appliquées automatiquement lorsque possible. |
| v1:COD-002 | Formatage | Le formatage est contrôlé par un outil reproductible. |
| v1:COD-003 | Analyse statique | Les erreurs dépassant les seuils définis bloquent les contrôles concernés. |
| v1:COD-004 | Complexité | Les seuils de complexité convenus sont respectés ou les exceptions justifiées. |
| v1:COD-005 | Duplication | La duplication significative est surveillée selon la politique du projet. |
| v1:COD-006 | Gestion des erreurs | Les erreurs sont traitées sans masquer les défaillances. |
| v1:COD-007 | Journalisation | Les journaux sont utiles et ne révèlent pas de secrets. |
| v1:COD-008 | Code mort | Le code inutilisé est supprimé ou sa conservation justifiée. |
| v1:COD-009 | Commentaires | Les commentaires expliquent les décisions ou contraintes non évidentes. |
| v1:COD-010 | Revue de code | Les changements soumis à revue sont approuvés avant fusion. |
| v1:COD-011 | Taille des changements | Les changements excessivement volumineux sont découpés ou justifiés. |
| v1:COD-012 | Conventions de nommage | Les noms respectent les conventions définies. |

### 5. TST — Tests et validation

| ID | Titre | Règle |
|---|---|---|
| v1:TST-001 | Tests unitaires | Les comportements unitaires critiques sont testés. |
| v1:TST-002 | Tests d'intégration | Les interactions entre composants critiques sont testées. |
| v1:TST-003 | Tests de bout en bout | Les parcours critiques sont validés. |
| v1:TST-004 | Tests de non-régression | Les défauts corrigés importants sont couverts par des tests adaptés. |
| v1:TST-005 | Couverture de tests | Les seuils de couverture convenus sont respectés. |
| v1:TST-006 | Tests négatifs | Les entrées invalides et les échecs attendus sont testés. |
| v1:TST-007 | Tests de sécurité | Les contrôles de sécurité requis sont exécutés. |
| v1:TST-008 | Tests de performance | Les objectifs de performance sont mesurés lorsque nécessaires. |
| v1:TST-009 | Reproductibilité | Les tests produisent des résultats fiables dans l'environnement annoncé. |
| v1:TST-010 | Isolation des tests | Les tests ne modifient pas involontairement des ressources externes. |
| v1:TST-011 | Données de test | Les données sensibles réelles ne sont pas utilisées sans autorisation. |
| v1:TST-012 | Acceptation | Les critères d'acceptation sont vérifiés avant livraison. |

### 6. SEC — Sécurité applicative

| ID | Titre | Règle |
|---|---|---|
| v1:SEC-001 | Modèle de menace | Les risques de sécurité sont évalués selon le contexte. |
| v1:SEC-002 | Gestion des secrets | Aucun secret ne doit être commité dans le dépôt. |
| v1:SEC-003 | Authentification | Les mécanismes d'authentification respectent les exigences applicables. |
| v1:SEC-004 | Autorisation | Les contrôles d'accès appliquent le principe du moindre privilège. |
| v1:SEC-005 | Validation des entrées | Les entrées non fiables sont validées et traitées de manière sûre. |
| v1:SEC-006 | Injection | Les risques d'injection pertinents sont maîtrisés. |
| v1:SEC-007 | Chiffrement | Les données sensibles sont protégées en transit et au repos selon les besoins. |
| v1:SEC-008 | Dépendances vulnérables | Les vulnérabilités dépassant les seuils convenus sont traitées. |
| v1:SEC-009 | Surface d'attaque | Les fonctionnalités et permissions inutiles sont réduites. |
| v1:SEC-010 | Mise à jour de sécurité | Un processus de traitement des vulnérabilités est défini. |
| v1:SEC-011 | Journalisation sécurisée | Les journaux ne divulguent pas de secrets ni de données sensibles. |
| v1:SEC-012 | Réponse aux incidents | Les incidents de sécurité ont un processus de traitement défini. |

### 7. DAT — Données, confidentialité et conformité

| ID | Titre | Règle |
|---|---|---|
| v1:DAT-001 | Classification des données | Les catégories de données et leur sensibilité sont identifiées. |
| v1:DAT-002 | Minimisation | Seules les données nécessaires sont collectées ou traitées. |
| v1:DAT-003 | Durée de conservation | Les durées de conservation sont définies lorsque nécessaire. |
| v1:DAT-004 | Suppression | Les mécanismes de suppression sont documentés et vérifiables. |
| v1:DAT-005 | Données personnelles | Les obligations applicables aux données personnelles sont évaluées. |
| v1:DAT-006 | Transferts externes | Les transferts vers des services externes sont documentés et autorisés. |
| v1:DAT-007 | Sauvegardes | Les données critiques sont sauvegardées selon les objectifs définis. |
| v1:DAT-008 | Restauration | La restauration est testée selon la criticité des données. |
| v1:DAT-009 | Intégrité | Les contrôles d'intégrité nécessaires sont mis en place. |
| v1:DAT-010 | Conformité réglementaire | Les exigences réglementaires applicables sont identifiées et validées par les responsables compétents. |

### 8. DEP — Dépendances et chaîne d'approvisionnement

| ID | Titre | Règle |
|---|---|---|
| v1:DEP-001 | Inventaire des dépendances | Les dépendances directes et indirectes sont identifiables. |
| v1:DEP-002 | Fichier de verrouillage | Le fichier de verrouillage est cohérent avec le manifeste. |
| v1:DEP-003 | Versions maîtrisées | Les stratégies de versionnement et de mise à jour sont définies. |
| v1:DEP-004 | Licences | Les licences sont vérifiées selon la politique du projet. |
| v1:DEP-005 | Provenance | La provenance des composants critiques est vérifiable lorsque requis. |
| v1:DEP-006 | Scripts d'installation | Les scripts exécutés lors de l'installation sont identifiés et maîtrisés. |
| v1:DEP-007 | Dépendances inutiles | Les dépendances non nécessaires sont supprimées. |
| v1:DEP-008 | Reproductibilité de l'installation | L'installation est reproductible dans les environnements pris en charge. |
| v1:DEP-009 | Mises à jour | Les mises à jour font l'objet de tests et d'une gestion des risques. |
| v1:DEP-010 | Composants abandonnés | Les dépendances non maintenues sont évaluées et traitées. |

### 9. DOC — Documentation et connaissances

| ID | Titre | Règle |
|---|---|---|
| v1:DOC-001 | README | Le projet dispose d'un guide de présentation et de démarrage. |
| v1:DOC-002 | Installation | Les prérequis et la procédure d'installation sont documentés. |
| v1:DOC-003 | Utilisation | Les commandes, options et exemples sont documentés. |
| v1:DOC-004 | Configuration | Les paramètres et leurs valeurs attendues sont décrits. |
| v1:DOC-005 | Architecture | Les éléments d'architecture nécessaires à la maintenance sont documentés. |
| v1:DOC-006 | Limites connues | Les limites et hypothèses importantes sont publiées. |
| v1:DOC-007 | Dépannage | Les erreurs fréquentes et les solutions sont documentées. |
| v1:DOC-008 | Changelog | Les changements livrés sont tracés. |
| v1:DOC-009 | Procédures opérationnelles | Les procédures d'exploitation sont documentées lorsque nécessaires. |
| v1:DOC-010 | Cohérence documentaire | Les exemples et instructions sont testés ou vérifiés régulièrement. |

### 10. GIT — Git, branches et revues

| ID | Titre | Règle |
|---|---|---|
| v1:GIT-001 | Historique versionné | Les changements sont enregistrés dans le système de gestion de versions. |
| v1:GIT-002 | Conventions de commit | Les messages de commit respectent la convention retenue. |
| v1:GIT-003 | Protection des branches | Les branches protégées imposent les vérifications requises. |
| v1:GIT-004 | Revue obligatoire | Les changements sensibles nécessitent une approbation. |
| v1:GIT-005 | Contrôles avant fusion | Les contrôles obligatoires passent avant la fusion. |
| v1:GIT-006 | Fichiers interdits | Les artefacts temporaires et secrets interdits ne sont pas versionnés. |
| v1:GIT-007 | Conflits de fusion | Les conflits sont résolus et les résultats validés. |
| v1:GIT-008 | Traçabilité des changements | Les changements sont reliés aux demandes ou tâches pertinentes. |

### 11. REL — Build, livraison et publication

| ID | Titre | Règle |
|---|---|---|
| v1:REL-001 | Build reproductible | La construction suit une procédure définie et vérifiable. |
| v1:REL-002 | Artefacts identifiés | Les artefacts sont associés à une version précise. |
| v1:REL-003 | Validation avant livraison | Les contrôles obligatoires passent avant livraison. |
| v1:REL-004 | Versionnement sémantique | La politique de versionnement est appliquée selon les règles retenues. |
| v1:REL-005 | Notes de version | Les changements importants sont documentés. |
| v1:REL-006 | Publication contrôlée | La publication est autorisée et effectuée par un processus maîtrisé. |
| v1:REL-007 | Intégrité des artefacts | L'artefact livré correspond à la version validée. |
| v1:REL-008 | Retour arrière | Une stratégie de retour à une version précédente est définie lorsque possible. |
| v1:REL-009 | Environnements | Les différences entre environnements sont documentées. |
| v1:REL-010 | Validation post-livraison | La livraison est vérifiée après déploiement ou publication. |

### 12. OPS — Exploitation, observabilité et maintenance

| ID | Titre | Règle |
|---|---|---|
| v1:OPS-001 | Journalisation opérationnelle | Les événements nécessaires au diagnostic sont enregistrés. |
| v1:OPS-002 | Métriques | Les métriques critiques sont identifiées lorsque pertinentes. |
| v1:OPS-003 | Alertes | Les incidents détectables disposent d'un mécanisme d'alerte adapté. |
| v1:OPS-004 | Surveillance | Les composants critiques font l'objet d'une surveillance appropriée. |
| v1:OPS-005 | Gestion des incidents | Les incidents sont enregistrés, qualifiés et suivis. |
| v1:OPS-006 | Objectifs de disponibilité | Les objectifs de service sont définis lorsqu'ils sont applicables. |
| v1:OPS-007 | Capacité | Les limites de capacité sont identifiées pour les systèmes concernés. |
| v1:OPS-008 | Maintenance corrective | Les anomalies sont priorisées et suivies. |
| v1:OPS-009 | Maintenance préventive | Les dépendances, configurations et composants sont revus périodiquement. |
| v1:OPS-010 | Fin de vie | La dépréciation et la fin de support sont communiquées. |

### 13. PKG — Contrats spécifiques au package npm

| ID | Titre | Règle |
|---|---|---|
| v1:PKG-001 | Compatibilité Node.js | Les versions de Node.js prises en charge sont déclarées et testées. |
| v1:PKG-002 | Manifeste npm | Le manifeste contient les métadonnées, scripts et contraintes attendus. |
| v1:PKG-003 | Entrées publiques | Les points d'entrée publiés sont définis et testés. |
| v1:PKG-004 | Contenu publié | L'artefact npm contient uniquement les fichiers attendus. |
| v1:PKG-005 | Installation vierge | Le package fonctionne après installation depuis l'artefact construit. |
| v1:PKG-006 | Interface CLI stable | Les commandes, options et codes de sortie sont documentés. |
| v1:PKG-007 | Aucun effet implicite | L'import ou l'invocation non destructive ne modifie pas un projet sans action explicite. |
| v1:PKG-008 | Compatibilité de version | Les changements incompatibles sont identifiés et documentés. |
| v1:PKG-009 | Dépendances du package | Les dépendances et leur rôle sont maîtrisés. |
| v1:PKG-010 | Publication vérifiée | L'artefact publié est testé avant diffusion. |
| v1:PKG-011 | Droits d'accès | Le package n'utilise que les permissions nécessaires. |
| v1:PKG-012 | Erreurs CLI | Les erreurs sont explicites et les codes de sortie cohérents. |
| v1:PKG-013 | Configuration invalide | Une configuration invalide est détectée avant toute modification risquée. |
| v1:PKG-014 | Reproductibilité | Les résultats sont déterministes à entrées et environnement équivalents, selon les limites documentées. |
| v1:PKG-015 | Tests multi-plateformes | Les plateformes déclarées prises en charge sont testées. |

### 14. INI — Initialisation et application : init/apply

| ID | Titre | Règle |
|---|---|---|
| v1:INI-001 | Initialisation sûre | init n'écrase pas silencieusement les fichiers existants. |
| v1:INI-002 | Idempotence de init | Une seconde initialisation ne duplique pas les fichiers. |
| v1:INI-003 | Idempotence de apply | Une application répétée ne produit pas de changements superflus. |
| v1:INI-004 | Détection des conflits | Les modifications concurrentes ou manuelles sont détectées. |
| v1:INI-005 | Préservation du client | Les modifications client sont préservées par défaut. |
| v1:INI-006 | Inventaire des fichiers gérés | Les fichiers gérés par le package sont identifiés. |
| v1:INI-007 | Prévisualisation | Les changements sensibles peuvent être inspectés avant application. |
| v1:INI-008 | Limitation au dossier cible | Les opérations sur les fichiers restent dans le périmètre autorisé. |
| v1:INI-009 | Protection contre les chemins dangereux | Les chemins, liens symboliques et traversées de répertoires sont traités de manière sûre. |
| v1:INI-010 | Configuration existante | Les outils et configurations existants sont détectés avant installation des hooks. |
| v1:INI-011 | Récupération après interruption | Une interruption ne doit pas laisser d'état incohérent non détecté. |
| v1:INI-012 | Version appliquée | La version du référentiel et l'état d'application sont traçables. |
| v1:INI-013 | Mise à jour contrôlée | Les changements du référentiel sont appliqués selon une stratégie explicite. |
| v1:INI-014 | Désinstallation sûre | Les fichiers gérés peuvent être identifiés et retirés sans supprimer les contenus client. |
| v1:INI-015 | Mode simulation | Les changements prévus peuvent être présentés sans modification du projet. |

### 15. CTR — Contrats, preuves et conformité

| ID | Titre | Règle |
|---|---|---|
| v1:CTR-001 | Identifiant stable | Chaque contrat possède un identifiant unique et stable. |
| v1:CTR-002 | Critère vérifiable | Chaque contrat décrit le résultat attendu. |
| v1:CTR-003 | Applicabilité explicite | Chaque contrat déclare ses conditions d'application. |
| v1:CTR-004 | Méthode de contrôle | Chaque contrat indique s'il est automatique, humain ou mixte. |
| v1:CTR-005 | Preuve associée | Les contrats concernés définissent les preuves acceptables. |
| v1:CTR-006 | Statut honnête | Une absence de vérification n'est jamais assimilée à une conformité. |
| v1:CTR-007 | Traçabilité du résultat | Chaque résultat est relié au contrat et à l'exécution concernée. |
| v1:CTR-008 | Historique des modifications | Les changements de contrat sont versionnés. |
| v1:CTR-009 | Exceptions approuvées | Les dérogations sont documentées et approuvées selon la politique. |
| v1:CTR-010 | Sévérité déclarée | Le niveau de blocage est défini par contrat ou politique. |
| v1:CTR-011 | Contrôle lui-même testé | Les contrôles automatisés disposent de tests démontrant leur capacité à détecter un écart. |
| v1:CTR-012 | Schéma versionné | Les formats de catalogue, configuration et résultats sont versionnés. |
| v1:CTR-013 | Résultat reproductible | Les résultats sont comparables dans les conditions documentées. |
| v1:CTR-014 | Origine du contrat | La source du contrat est identifiable : socle, profil ou règle locale. |
| v1:CTR-015 | Responsabilité de validation | Le rôle responsable de la validation est déclaré pour les contrats concernés. |

### 16. HOOK — Hooks, CI/CD et politiques de blocage

| ID | Titre | Règle |
|---|---|---|
| v1:HOOK-001 | Pré-commit configuré | Les contrôles rapides sont disponibles avant commit. |
| v1:HOOK-002 | CI obligatoire | Les contrôles obligatoires sont exécutés dans une CI protégée. |
| v1:HOOK-003 | Politique commune | La politique de contrôle est cohérente entre local et CI. |
| v1:HOOK-004 | Contrôles ciblés | Les contrôles locaux peuvent être limités aux changements pertinents lorsque fiable. |
| v1:HOOK-005 | Codes de sortie | Les résultats déterminent des codes de sortie documentés. |
| v1:HOOK-006 | Blocage configurable | Les règles bloquantes sont configurables selon le profil et la politique. |
| v1:HOOK-007 | Hook vérifiable | Le package peut vérifier la présence et la configuration des hooks attendus. |
| v1:HOOK-008 | Installation non destructive | L'installation ne remplace pas silencieusement les hooks existants. |
| v1:HOOK-009 | Contournement local compensé | La CI vérifie les règles obligatoires indépendamment des hooks locaux. |
| v1:HOOK-010 | Sorties structurées | Les contrôles produisent des rapports consommables par la CI. |
| v1:HOOK-011 | Durée maîtrisée | Les contrôles pré-commit respectent un budget de durée défini. |
| v1:HOOK-012 | Échec d'infrastructure | Un contrôle qui ne peut pas fonctionner est distingué d'une conformité. |
| v1:HOOK-013 | Pré-publication | Une vérification spécifique est exécutée avant publication du package. |
| v1:HOOK-014 | Protection de la branche | Les règles obligatoires sont imposées par la plateforme de dépôt lorsque possible. |

### 17. TMA — Maintenance corrective et évolutive

| ID | Titre | Règle |
|---|---|---|
| v1:TMA-001 | Qualification des anomalies | Les anomalies sont décrites avec contexte et reproduction lorsque possible. |
| v1:TMA-002 | Priorisation | Les anomalies sont classées selon leur impact et leur urgence. |
| v1:TMA-003 | Délais de traitement | Les objectifs de prise en charge sont définis si un engagement de service existe. |
| v1:TMA-004 | Correction testée | Les corrections pertinentes sont accompagnées de tests. |
| v1:TMA-005 | Non-régression | Une correction ne doit pas introduire de régression non détectée par les contrôles requis. |
| v1:TMA-006 | Compatibilité ascendante | Les changements de comportement public sont évalués et documentés. |
| v1:TMA-007 | Dépréciation | Les fonctionnalités dépréciées suivent une politique annoncée. |
| v1:TMA-008 | Migration | Les changements de configuration ou de données disposent de consignes de migration. |
| v1:TMA-009 | Support des versions | Les versions maintenues et leur durée de support sont identifiées. |
| v1:TMA-010 | Retour d'expérience | Les incidents importants alimentent les améliorations du produit. |

### 18. IP — Propriété intellectuelle et relation contractuelle

| ID | Titre | Règle |
|---|---|---|
| v1:IP-001 | Droits sur les livrables | Les droits applicables aux livrables sont définis contractuellement. |
| v1:IP-002 | Licences tierces | Les composants tiers sont utilisés conformément à leurs licences. |
| v1:IP-003 | Confidentialité | Les informations confidentielles sont protégées selon les engagements applicables. |
| v1:IP-004 | Réutilisation | Les règles de réutilisation des composants et savoir-faire sont définies. |
| v1:IP-005 | Livrables identifiés | Les livrables attendus et leurs critères d'acceptation sont explicités. |
| v1:IP-006 | Limites de responsabilité | Les responsabilités et limites de service sont définies dans le contrat approprié. |
| v1:IP-007 | Réversibilité client | Les modalités de transfert, d'export et de reprise sont documentées si requises. |
| v1:IP-008 | Dépendances externes | Les services tiers et leurs contraintes sont déclarés. |
| v1:IP-009 | Acceptation formelle | Les livrables soumis à acceptation disposent d'un processus défini. |
| v1:IP-010 | Conservation des preuves | Les éléments nécessaires à démontrer l'exécution des obligations sont conservés selon une politique définie. |

### 19. X — Contrats transversaux

| ID | Titre | Règle |
|---|---|---|
| v1:X-001 |  | Aucun résultat ne peut être déclaré conforme sans vérification suffisante. |
| v1:X-002 |  | Chaque règle doit être traçable vers son origine. |
| v1:X-003 |  | Chaque contrôle automatique doit posséder un test positif et un test négatif. |
| v1:X-004 |  | Les erreurs de contrôle sont distinguées des violations de règles. |
| v1:X-005 |  | Les modifications client sont préservées par défaut. |
| v1:X-006 |  | Les règles bloquantes sont imposées par la CI protégée lorsque la plateforme le permet. |
| v1:X-007 |  | Les exceptions sont documentées et approuvées. |
| v1:X-008 |  | Les formats de configuration et de rapport sont versionnés. |
| v1:X-009 |  | Toute modification du catalogue fait l'objet de tests de non-régression. |
| v1:X-010 |  | Les limites et prérequis des contrôles sont documentés. |

### 20. Profils de référence

- **DOGFOODING** (dépôt qui produit le paquet npm) : v1:GOV, v1:COD,
  v1:TST, v1:SEC, v1:DEP, v1:DOC, v1:GIT, v1:REL, v1:PKG, v1:INI, v1:CTR,
  v1:HOOK, v1:TMA. Exigences : contrôler le dépôt avec le paquet
  lui-même ; tester les commandes CLI ; tester init et apply sur des
  projets temporaires ; tester la construction et l'installation de
  l'artefact npm ; bloquer les fusions si les contrôles obligatoires
  échouent ; bloquer les publications si les contrôles de release
  échouent.
- **CLIENT-STANDARD** (projet logiciel client standard) : v1:GOV, v1:REQ,
  v1:ARC, v1:COD, v1:TST, v1:SEC, v1:DEP, v1:DOC, v1:GIT, v1:REL, v1:INI,
  v1:CTR, v1:HOOK, v1:TMA ; les contrats d'architecture, de données,
  d'exploitation et de réglementation s'activent selon le contexte.
- **CLIENT-RENFORCE** (sécurité, traçabilité ou conformité renforcées) :
  CLIENT-STANDARD, plus en compléments conditionnels v1:DAT, v1:OPS,
  v1:IP, contrôles de sécurité renforcés, preuves de validation
  formalisées, gestion renforcée des exceptions, conservation des
  résultats de contrôle, approbations humaines obligatoires pour les
  exigences non automatisables.

### 21. Champs obligatoires du catalogue machine

id, title, description, domain, severity, scope, applicability,
verification.mode, verification.command (si applicable),
acceptanceCriteria, evidence, onUnverified, enforcement, remediation,
owner, version, source, references. Schémas et valeurs autorisées à
définir formellement avant l'implémentation du moteur.

### 22. Politique d'application

1. Les contrats du socle sont livrés avec le paquet.
2. Les profils déterminent les contrats applicables.
3. Les règles locales peuvent compléter le socle selon les limites de la
   politique.
4. Les exceptions doivent être justifiées et traçables.
5. Les contrôles rapides sont exécutés au pré-commit.
6. Les contrôles obligatoires sont réexécutés dans la CI.
7. Les contrôles de publication sont exécutés avant la diffusion npm.
8. Une vérification impossible ne vaut jamais conformité.
9. Les modifications des projets clients sont préservées par défaut.
10. Les changements incompatibles du catalogue sont versionnés et
    accompagnés d'instructions de migration.
