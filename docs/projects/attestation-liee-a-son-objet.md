# Projet : une attestation tombe quand ce qu'elle couvre change

**Statut** : cadré le 2026-10-21 — décisions du demandeur consignées, prête à lancer.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/attestation-liee-a-son-objet.md`

<!-- scope
files:
  - packages/drwil/src/verify.ts
  - packages/drwil/src/attest.ts
  - packages/drwil/src/doctor.ts
  - packages/drwil/src/index.ts
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/test/kit.test.mjs
  - .githooks/contracts.mjs
  - .githooks/contracts.test.mjs
  - packages/drwil/templates/common/base/.githooks/contracts.mjs
  - packages/drwil/templates/common/base/docs/contracts.md
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/ia-first.md
  - docs/contracts.md
  - docs/architecture.md
  - .drwil/ia-first.json
  - outils/miroirs.json
  - README.md
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/attestation-liee-a-son-objet.md
-->

(cadrage : le moteur `drwil verify` et `drwil attest` (`packages/drwil/src/`),
l'analyseur de contrats partagé `.githooks/contracts.mjs` et son gabarit, les
tests, la doc, les contrats, le changelog. Aucun contrat existant du dépôt ne
reçoit de champ `**Covers**` dans ce chantier.)

Cible : drwil-le-livrable (moteur et gabarit), jamais une copie installée
seule (QUA-018, dépôt contre livrable).

## 1. Besoin

Une attestation humaine reste `ATTESTED` après un changement de ce qu'elle est
censée couvrir. Reproduit deux fois : dans `drwil_com` (une dépendance ajoutée
laisse SEC-006 attesté, scénario S6) et dans ce dépôt (QUA-013 reste attesté
après la modification de `.github/workflows/ia-first.yml`, 2026-10-18). Et un
humain qui veut réattester une attestation encore valide ne le peut pas.
Règle : une attestation n'est valide que tant que l'objet qu'elle atteste reste
conforme à l'état évalué.

## Critères d'acceptation

- Un fichier couvert par un contrat (champ `**Covers**`), modifié, ajouté,
  supprimé ou renommé sans toucher au contrat, fait tomber son attestation en
  `MANUAL` ; `verify` ne rend plus PASS et nomme le fichier qui a changé ;
  un fichier hors couverture laisse l'attestation `ATTESTED` — contrat à créer
- Un contrat attestable sans `**Covers**` est signalé par `verify` et `doctor`
  sans faire tomber son attestation ; une attestation de format ancien reste
  lisible, sa première réattestation passe au nouveau format — contrat à créer
- `drwil attest` renouvelle volontairement une attestation encore valide (option
  dédiée), toujours depuis un terminal interactif, sans que l'identifiant
  retapé ni l'identité du geste soient affaiblis — contrat à créer

## Contrats modifiés

- `QUA-032` — ancien critère : « une attestation (version 2) couvre la part
  humaine d'un contrat et, séparément, la définition de chaque contrôle attesté ;
  un contrôle ajouté ensuite ne la rend pas obsolète » — raison : elle couvre
  aussi l'empreinte du contenu des fichiers du champ `**Covers**` (version 3),
  la règle des contrôles ajoutés restant inchangée (validé le 2026-10-21)

## 2. Hors périmètre

- Déclarer `**Covers**` sur les contrats attestés du dépôt (QUA-013, etc.) : cela
  exige des réattestations humaines ; une intention à la clôture.
- Distinguer un changement de forme (formatage) d'un changement de fond :
  tout changement de contenu d'un fichier couvert fait tomber l'attestation.
- Les critères et preuves durables après clôture
  (`docs/intentions/criteres-et-preuves-durables.md`), chantier suivant.
- La barrière de fusion (`docs/intentions/forge-dans-le-livrable.md`).

## 3. Contraintes

- La règle de validité est écrite avant le mécanisme (consigne du demandeur
  du 2026-10-17) : lot 1.
- Une attestation sans empreinte de fichiers (version 1 ou 2) garde sa validité
  actuelle : aucune réattestation forcée (QUA-032, une attestation ne coûte que
  le jugement demandé).
- L'empreinte est calculée sur le contenu des fichiers, indépendante de git et
  rejouable en CI ; l'ordre des chemins et la fin de ligne ne changent pas
  l'empreinte (hors contenu).
- `drwil attest` reste un geste humain : terminal interactif, identifiant
  retapé, jamais de `--yes` (QUA-019 pas de contournement).
- Fichiers de code plafonnés à 400 lignes (QUA-001) : `packages/drwil/src/verify.ts`
  en a 372, la logique d'empreinte de couverture va dans un nouveau module du
  paquet plutôt que dans le fichier `packages/drwil/src/verify.ts`.
- On n'édite que le gabarit livré et son miroir déclaré (`miroirs-gabarit`).

## 4. Décisions

Prises par le demandeur le 2026-10-21 :

- Règle de validité : l'objet attesté est ce que le contrat déclare couvrir, en
  chemins ; une couverture absente est signalée sans faire tomber l'attestation
  existante.
- Où : un nouveau champ `**Covers**`, des motifs de chemins lisibles par une
  machine.
- Fichier supprimé, renommé ou ajouté sous un motif couvert : chacun fait
  tomber l'attestation.
- Mécanisme : empreinte du contenu des fichiers couverts, indépendante de git.
- Renouvellement volontaire d'une attestation encore valide : une option de
  `drwil attest`.
- Changement de forme pur : fait tomber l'attestation, faute de moyen sûr de le
  distinguer.

## 5. Points à trancher

Aucun : tranchés le 2026-10-21 (voir ci-dessus).

## 6. Lots

- **Lot 1 — règle et test rouge** [IA] : la règle de validité écrite dans
  `docs/ia-first.md` ; le scénario S6 reproduit (test rouge) sur un dépôt
  temporaire ; `**Covers**` lu par `.githooks/contracts.mjs` (dépôt et gabarit).
  Critère de sortie : test rouge de S6 et tests de l'analyseur verts.
- **Lot 2 — empreinte et verdict** [IA] : empreinte du contenu des fichiers
  couverts, attestation version 3, `verify` rend `MANUAL` et nomme le fichier
  (modifié, ajouté, supprimé, renommé) ; format ancien lisible. Critère de
  sortie : S6 vert, tests de chaque cas.
- **Lot 3 — attest et doctor** [IA] : option de renouvellement de `drwil
  attest`, signalement d'un contrat attestable sans couverture par `verify` et
  `doctor`. Critère de sortie : tests verts.
- **Lot 4 — gabarit, doc, contrats** [IA] : gabarit et miroirs, README,
  changelog, carte d'architecture, les contrats créés avec leurs contrôles dans
  `.drwil/ia-first.json`, QUA-032 modifié.

## 7. Reprise

- **Dernier état** (2026-10-21) : cadré, rien de commencé ; décisions consignées
  ci-dessus ; tout est tranché, prête.
- **Travail non commité** : cette fiche, sa ligne d'index et la mise à jour de
  l'intention.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
