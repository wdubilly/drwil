# Intention : fluidité sans perte de rigueur — solliciter l'humain juste

**Statut** (2026-10-10) : à cadrer — intention posée par le demandeur,
questions à trancher en fin de fiche.

**Projet** : DRWIL — **Niveau de risque** : HIGH (touche aux transitions
humaines de la gouvernance).

## Besoin

Le workflow obtenu le 2026-10-09 approche le développement fiable visé,
mais il est lourd pour l'humain. Compté sur cette seule journée : environ
12 transitions humaines (chacune dans un terminal, le préfixe `!` de
Claude Code ne fournissant pas de terminal interactif), 8 PR fusionnées
une à une, 5 attestations séparées, une quinzaine de questions au fil de
l'eau, 4 échecs de CI ou de contrôle dus au même piège de doc.

Constat : la rigueur tient à **quelques décisions humaines bien placées**,
pas au nombre de gestes. Intention : garder les mêmes garanties (l'agent
ne définit pas seul ce qui est acceptable ; triche détectable et refusée
hors du poste) en sollicitant l'humain **moins souvent et au bon moment**.

## Existant

- Gouvernance livrée le 2026-10-09 (`docs/projets/journal.md`, entrée
  « Gouvernance : machine d'état et double barrière ») : transitions par
  `node .githooks/etat.mjs passer …`, humaines par défaut pour ouvrir une
  attente, lancer la réalisation et clore (terminal interactif).
- Réglages `transitions` et `barriere` de `.drwil/ia-first.json`.
- `drwil attest` : une attestation par contrat, dans un terminal.
- Claude Code : hook `SessionStart` déjà branché sur l'état ; les hooks de
  saisie (`UserPromptSubmit`) ne sont pas utilisés.

## Leviers identifiés

1. **Deux gestes humains par chantier** : *lancer* (valider fiche et
   cadrage, ce qui ouvre l'attente et autorise la réalisation en une fois)
   et *fusionner la PR* (déjà la relecture humaine). La clôture devient
   mécanique, sur l'évidence de `drwil verify` (PASS ou ATTESTED, sur
   `HEAD`, arbre propre), puisque le dernier mot reste à la fusion.
2. **Décider dans le chat sans pouvoir être simulé** : un hook de l'outil
   déclenché par la saisie de l'humain (Claude Code : `UserPromptSubmit`,
   par exemple sur `/drwil go`) enregistre la décision ; c'est l'outil qui
   l'écrit, pas le modèle. Repli : le terminal, pour les autres outils.
3. **Grouper** : une PR par session de travail plutôt qu'une par fiche ;
   une seule commande pour attester tous les contrats en attente (liste
   affichée, confirmation unique) ; questions groupées au démarrage d'un
   lot, choix recommandés appliqués par défaut sauf objection.
4. **Supprimer les sources de reprises** : voir
   `docs/projets/citations-fichiers-ignores.md` et
   `docs/projets/entretien-sous-barriere-bloquante.md`.
5. **Relire vite** : voir `docs/intentions/vue-de-relecture.md`.
6. **Mesurer** : le bench (`docs/intentions/bench-avec-sans-drwil.md`)
   compte les sollicitations humaines par tâche, pour vérifier que la
   fluidité progresse sans perte de qualité.
7. **Rappeler sans dériver** (ajouté le 2026-10-10) : à chaque message,
   un rappel court de l'état lu sur disque (activité, fiche, périmètre),
   pour que l'agent ne dérive pas au fil d'une longue session ; moins de
   tentatives interdites, donc moins de refus et de reprises. Fait : voir
   `docs/projets/journal.md` (2026-10-10, rappel court de l'état).

## Contraintes

- Aucune transition qui ouvre des droits ne devient décidable par l'agent
  seul.
- Agnostique de l'agent : le levier 2 est un accélérateur propre à un
  outil, jamais la seule voie.
- Le réglage `transitions` (`humain` / `agent`) et la sévérité `barriere`
  restent les points de réglage, sans nouveau mode caché.

## Questions à trancher

1. **Levier 1** : fusionner ATTENTE, DEMANDE et REALISATION en un seul
   geste humain ? Rendre la clôture mécanique, la fusion de la PR tenant
   lieu de décision humaine ? (le levier le plus rentable : il supprime à
   lui seul la moitié des allers-retours au terminal)
2. **Levier 2** : la décision par hook de saisie est-elle une garantie
   suffisante pour remplacer le terminal dans Claude Code ?
3. **Levier 3** : une PR par session, ou une par chantier ? Attestation
   groupée : oui ou non ?
4. **Ordre** : quels leviers en premier, et dans quelle fiche (révision de
   la gouvernance, ou fiches séparées) ?
