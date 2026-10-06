# Projet : titre court

**Statut** : cadré le AAAA-MM-JJ — lot 1 en cours.
**Risque** : MEDIUM

(niveau de risque, `docs/ia-first.md` section 7 : LOW n'a pas de fiche — se
rattacher à `docs/projets/entretien-courant.md` ; MEDIUM : fiche + cadrage ;
HIGH : en plus une section Décisions et les contrats concernés cités. Un
cadrage qui touche `.githooks/`, la CI ou `.drwil/` impose HIGH ; on peut
toujours monter, jamais descendre.)

<!-- cadrage
fichiers:
  - backend/app/routers/exemple.py
  - frontend/src/components/Exemple*
-->

(bloc `cadrage` : un chemin ou un motif par ligne, sous `fichiers:` ; couvre
les fichiers de code que ce chantier touche, pour le rappel de cadrage —
`docs/ia-first.md`, section 7. Un motif trop large, `**` ou `scripts/*`, est
refusé : nommer le fichier ou un motif d'au moins deux dossiers.)

## 1. Besoin

(ce que le projet doit produire, pour qui, et pourquoi maintenant)

## 2. Hors périmètre

(ce que ce projet ne traite pas, pour éviter qu'un agent l'étende de lui-même)

## 3. Contraintes

(techniques, métier, de calendrier)

## 4. Décisions

(tranchées par le demandeur, datées)

## 5. Points à trancher

- [décision] ...

## 6. Lots

- **Lot 1 — titre** [IA|humain] : contenu. Critère de sortie : ce qui prouve
  que le lot est fini (tests verts, contrôle qui passe...).

## 7. Reprise

- **Dernier état** (AAAA-MM-JJ) : ...
- **Travail non commité** : ...
- **Prochaine étape** : [IA|humain|décision] ...
