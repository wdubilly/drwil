# Intention : un tableau de bord interactif en serveur local léger

**Statut** : proposée le 2026-10-27 — reprise d'une intention posée le 2026-10-19
(« application de suivi des chantiers »), retirée au ménage des intentions
alors que le serveur n'avait pas été construit.

## Besoin

Un petit tableau de bord, en serveur local léger, pour suivre les chantiers
selon tous leurs aspects (état, cadrage, preuves, coût, intentions et
décisions en attente). Il doit être **embarquable avec le paquet** et
**interactif a minima** : lecture seule ne suffit pas.

## Existant (relevé le 2026-10-27)

- Le skill `drwil-progress` génère un tableau de bord HTML statique
  (avancement, couverture des contrats), sans serveur ni déploiement.
- `.drwil/usage.jsonl` porte la consommation de tokens par chantier ;
  `.drwil/state.json` (si présent), les fiches, l'index et le journal portent l'état, le
  cadrage et l'historique, déjà versionnés.
- Intention voisine : `docs/intentions/vue-de-relecture.md` (ce qui demande le
  jugement de l'humain dans une PR), qui garde pour règle l'absence de
  serveur ou de SaaS imposé par défaut.
- Aucun serveur n'existe : le message du ménage des intentions du 2026-10-26
  la jugeait couverte par le tableau de bord statique, ce qui ne répond pas
  au besoin d'interactivité.

## Pistes envisagées (de la fiche retirée)

1. Tableau de bord HTML statique enrichi, régénéré à la demande.
2. Serveur local embarqué (par exemple `drwil ui`, Node sans dépendance,
   écoute sur `127.0.0.1`), qui rafraîchit en direct à partir des fichiers.
3. Application native (Tauri ou Electron), publiée à part et non embarquée.

Première étape visée : navigation, filtres, rafraîchissement en direct,
bouton `drwil verify`. Les gestes humains (lancer un chantier, attester,
verdict de recette) viendraient ensuite, protégés par un jeton de session
affiché dans le terminal de l'humain, pour qu'un agent qui appellerait l'API
locale ne puisse pas les déclencher.

## Questions à trancher

- [décision] Quelle piste : statique enrichi, serveur local, ou application
  native ? Le serveur local reste-t-il optionnel (pas imposé par défaut) ?
- [décision] Quelles vues en première étape, et lesquelles viennent avec
  l'intention sur la vue de relecture ?
- [décision] Quels gestes humains passent par le tableau de bord (attester,
  lancer un chantier), et comment le jeton de session prouve que l'action
  vient de l'humain et non de l'agent ?
- [décision] Le coût : le serveur ne doit rien injecter au modèle (comme
  l'accueil de session, gratuit).
