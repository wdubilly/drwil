# Projet : investigation & reporting par agent (V3, expérimentation)

**Statut** : posé le 2026-10-06 — en attente, expérimentation / prototype prévue après la stabilisation du cœur (V0.2 / V1).

**Version cible** : V3 — **Type** : extension du périmètre de DRWIL.

## 1. Besoin

Explorer l'utilisation de DRWIL pour gouverner des travaux produits par des
agents qui ne sont pas principalement du développement logiciel. Premier cas
d'usage envisagé : l'investigation à partir de logs ou de données, avec
production d'un rapport.

L'expérimentation doit déterminer si le modèle fondamental de DRWIL est
suffisamment générique pour s'appliquer au-delà du code :

```text
Contract → Control → Evidence → Verify → Verdict
```

Vision V3 : DRWIL ne serait plus limité à la gouvernance du travail de
développement.

```text
HUMAIN → EXIGENCES EXPLICITES → AGENT → TRAVAIL / ARTIFACT → PREUVES → DRWIL VERIFY → VERDICT
```

Artefacts gouvernés possibles : code, rapports, investigations, analyses,
audits, synthèses, procédures, autres productions d'agents.

Question produit :

> **Est-ce que DRWIL est un outil de gouvernance du code, ou un outil de
> gouvernance du travail produit par des agents ?**

La V3 doit permettre d'y répondre expérimentalement.

## 2. Hors périmètre

Cette expérimentation ne doit pas entraîner prématurément :

- de commandes métier (`drwil logs`, `drwil investigate`, etc.) ;
- de logique propre aux investigations dans le cœur de DRWIL ;
- de refonte de l'architecture actuelle ;
- d'abandon du focus développement logiciel.

## 3. Contraintes

- La priorité reste la stabilisation du cœur de DRWIL (V0.2,
  `docs/projets/drwil-v0-2-gouvernance-executable.md`) avant toute extension.
- Réutiliser le modèle existant (contrats de `docs/contrats.md`, contrôles du
  moteur, `drwil verify`, évidences et attestations) plutôt que d'en créer un
  second.

## 4. Décisions

- 2026-10-06 : expérimentation inscrite au backlog, sans code pour l'instant.
  [décision utilisateur]

## 5. Points à trancher

- [décision] Date de démarrage : après quel jalon du cœur (fusion V0.2,
  V1 stabilisée) ?
- [décision] Cas d'usage pilote précis (quels logs ou quelles données, quel
  rapport attendu, quel demandeur humain).
- [décision] Où vit l'expérimentation (dépôt d'exemple séparé, dossier
  d'expérimentation) pour ne rien coupler au cœur.

## 6. Lots

- **Lot 1 — Cas pilote** [décision] : choisir un cas d'investigation réel et
  écrire ses exigences comme des contrats (Règle, Contrôle, Manuel).
- **Lot 2 — Prototype sans modifier le cœur** [IA] : gouverner le rapport
  avec les primitives existantes (contrôles du projet déclarés dans
  `.drwil/ia-first.json`, `drwil verify`, attestation humaine pour le
  jugement). Noter chaque endroit où le cœur a dû être modifié ou contourné.
- **Lot 3 — Bilan** [humain] : répondre à la question produit. Critère de
  réussite : un cas d'usage non-code gouverné avec **peu ou pas de
  modification du cœur**, ce qui confirmerait que contrats, contrôles,
  preuves et verdicts forment une abstraction générale.

## 7. Reprise

- **Dernier état** (2026-10-06) : fiche posée, rien d'engagé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [décision] fixer le jalon de démarrage et le cas
  pilote (section 5).
