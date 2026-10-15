# Projet : titre court

**Statut** : cadré le AAAA-MM-JJ — lot 1 en cours.
**Risque** : MEDIUM
**Maturité** : à affiner | prêt | en cours

(maturité : « prêt » = entièrement tranchée, peut être lancée ; « à
affiner » = points encore ouverts ; « en cours » = en construction.
Facultative : une fiche sans ce champ est « non renseignée », proposée sans
avertissement de maturité.)

(statut : « cadré le … », « lot 1 en cours »… ; une fiche qui n'est pas un
chantier (mécanique du kit) : « référence — … », jamais proposée au
lancement ; « terminé le AAAA-MM-JJ » seulement au moment de la condenser :
une fiche qui le porte ne peut pas rester — `docs/projects/journal.md`, puis
suppression.)

(niveau de risque, DRWIL-012 : LOW n'a pas de fiche — se rattacher à
`docs/projects/routine-maintenance.md` ; MEDIUM : fiche + cadrage ; HIGH : en
plus une section Décisions et les contrats concernés cités. Un cadrage qui
touche `.githooks/`, la CI ou `.drwil/` impose HIGH ; on peut toujours
monter, jamais descendre.)

<!-- scope
files:
  - backend/app/routers/exemple.py
  - frontend/src/components/Exemple*
-->

(bloc `scope` : un chemin ou un motif par ligne, sous `files:` ; couvre
les fichiers de code que ce chantier touche, pour le rappel de cadrage —
`docs/ia-first.md`, section 7. Un motif trop large, `**` ou `scripts/*`, est
refusé : nommer le fichier ou un motif d'au moins deux dossiers.)

## 1. Besoin

(ce que le projet doit produire, pour qui, et pourquoi maintenant)

## Critères d'acceptation

(une ligne par critère de la demande, liée à sa preuve : l'ID du contrat ou
du contrôle entre accents graves, par exemple `- Un export vide est refusé —
`CTR-012``, ou le marqueur `[humain]` pour un jugement humain, qui renvoie à
un contrat `Manuel` attesté par `drwil attest`. La preuve est durable, un
contrat avec `Contrôle` rejoué à chaque chantier : elle devient la
non-régression métier. Un critère de niveau métier, pas un par détail
technique. C'est l'outil qui évalue, jamais l'agent.)

- Critère vérifiable — `ID-DU-CONTRAT`
- Critère de jugement humain [humain] — `ID-DU-CONTRAT-MANUEL`

## Contrats modifiés

(seulement si ce chantier change exprès un contrat existant : une puce par
contrat, son ID entre accents graves en tête, puis l'ancien critère et la
raison, validés par le demandeur au cadrage, jamais par l'agent en cours de
route. Un contrat modifié dans la branche sans ligne ici est une
régression : `drwil verify` le signale et la clôture est refusée.)

- `ID-DU-CONTRAT` — ancien critère : « ... » — raison : ... (validé le AAAA-MM-JJ)

## 2. Hors périmètre

(ce que ce projet ne traite pas, pour éviter qu'un agent l'étende de lui-même)

## 3. Contraintes

(techniques, métier, de calendrier)

## 4. Décisions

(tranchées par le demandeur, datées)

## 5. Points à trancher

- [décision] ...

## 6. Increments

- **Lot 1 — titre** [IA|humain] : contenu. Critère de sortie : ce qui prouve
  que le lot est fini (tests verts, contrôle qui passe...).

## 7. Reprise

- **Dernier état** (AAAA-MM-JJ) : ...
- **Travail non commité** : ...
- **Prochaine étape** : [IA|humain|décision] ...
