# Projet : outiller SEC-006 — audit des dépendances dans les contrôles

**Statut** : cadré le 2026-10-11 — décisions prises, lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - outils/audit-dependances.mjs
  - outils/audit-dependances.test.mjs
  - .drwil/ia-first.json
  - docs/contrats.md
-->

(cadrage : un contrôle propre à ce dépôt — QUA-018 (périmètre explicite :
dépôt drwil vs livrable gabarit) : le gabarit prévoit déjà que chaque projet
déclare son propre audit pour SEC-006, il ne change pas. HIGH imposé : le
cadrage touche `.drwil/`.)

## 1. Besoin

Vague 1 de la feuille de route (`docs/projets/en-attente.md`, 2026-10-11).
SEC-006 (pas de dépendance vulnérable connue) n'est aujourd'hui satisfait
que par une attestation humaine du 2026-10-09, sans note ni outil : une
faille publiée demain ne bloquerait rien. Intention : qu'un audit des
dépendances tourne au commit, au push et en CI, et devienne la preuve de
SEC-006, sans signature humaine. Contrat candidat réalisé : v1:SEC-008
(`docs/intentions/catalogue-cycle-de-vie.md`).

Constat du 2026-10-11 : `npm audit` ne trouve aucune vulnérabilité ; il rend
le même code de sortie (1) pour une faille trouvée et pour un registre
injoignable — le brancher tel quel mélangerait « vulnérable » et « non
vérifié » (QUA-013).

## 2. Hors périmètre

- Le gabarit livré : son SEC-006 invite déjà le projet à déclarer son audit.
- Les licences des dépendances (v1:DEP-004) et leur provenance (v1:DEP-005).
- La mise à jour automatique des dépendances.

## 3. Contraintes

- Contrôle déclaré dans `.drwil/ia-first.json` (`checks`, avec `chemins`
  et `ciJob`), donc rejoué au commit, au push et en CI ; au commit, il ne
  tourne que si le manifeste, le verrou ou l'outil changent.
- Jamais vert sans audit réellement exécuté (QUA-013) : la sortie JSON de
  `npm audit` distingue une erreur (registre injoignable) d'un résultat.
- Le script se teste sans réseau (sortie de `npm audit` injectée).

## 4. Décisions

- **2026-10-11 — Seuil** : une faille `high` ou `critical` bloque ; les
  `moderate` et `low` sont affichées sans bloquer. [décision utilisateur]
- **2026-10-11 — Dépendances auditées** : toutes, production et
  développement. [décision utilisateur]
- **2026-10-11 — Hors ligne** : échec explicite « audit non exécuté :
  registre injoignable », jamais vert ; ne bloque un commit hors ligne que
  s'il touche le manifeste ou le verrou. [décision utilisateur]
- **2026-10-11 — Dépôt seulement** : le gabarit ne change pas.
  [décision utilisateur]

## Contrats concernés

- **SEC-006** — Pas de dépendance vulnérable connue : devient prouvé par le
  contrôle (champ Contrôle), son champ Manuel disparaît.
- **QUA-013** — Contrôle non exécuté n'est pas passé : un audit impossible
  n'est jamais un succès.

## 5. Points à trancher

- ~~Seuil, dépendances, hors ligne~~ — tranchés le 2026-10-11 (voir
  « Décisions »).

## 6. Lots

- **Lot 1 — script d'audit** [IA] : `outils/audit-dependances.mjs` (à créer)
  (`npm audit --json`, seuil high, résultat ou erreur distingués, résumé
  par gravité) et ses tests sans réseau. Critère de sortie : une faille
  high fait échouer, une moderate passe en l'affichant, un registre
  injoignable échoue avec « non exécuté » (tests).
- **Lot 2 — preuve de SEC-006** [IA] : contrôle déclaré dans
  `.drwil/ia-first.json`, SEC-006 cite ce contrôle. Critère de sortie :
  `drwil verify` rend SEC-006 en PASS sans attestation ; CI verte.

## 7. Reprise

- **Dernier état** (2026-10-11) : fiche cadrée, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] `/drwil-lancer`.
