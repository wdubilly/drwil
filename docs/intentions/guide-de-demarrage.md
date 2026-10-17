# Intention : un guide de démarrage — prérequis, recommandations, options

**Statut** : proposée le 2026-10-17 — retour d'expérience de `drwil_com`
(rapport « docs/experiments/acceptance-criteria-report.md » de ce dépôt,
section 6 de la demande), à faire après les évolutions du kit.

## Besoin

Documenter ce qui fluidifie le démarrage avec un agent, en distinguant
clairement trois niveaux : **prérequis techniques** (sans eux, le kit ne
marche pas), **recommandations** (ils fluidifient et sécurisent) et
**options** (facultatives). Quatre sujets :

1. **Dépôt git existant** : ce que `init` attend d'un dépôt existant, ce
   qu'il crée ou modifie, comment préserver l'historique et les
   changements en cours ; une procédure pour un projet neuf, une pour un
   dépôt existant.
2. **Autorisation de l'auto-merge** (option) : à activer dans les réglages
   du dépôt GitHub pour s'en servir ; sinon, drwil le dit et ne laisse pas
   croire que la fusion est programmée. Distinguer : PR fusionnable,
   auto-merge autorisé par le dépôt, auto-merge programmé, fusion faite.
3. **Protection de la branche principale** (recommandation) : exiger les
   contrôles de CI ; exemple de configuration GitHub, permissions
   nécessaires, limites.
4. **Redémarrer la session de l'agent** après l'installation ou un
   changement de hooks (constaté le 2026-10-17 et confirmé par le
   demandeur le même jour : la session `drwil_com` avait été ouverte avant
   `init`, aucun hook n'était actif). Le présenter comme dépendant de
   l'outil, avec un contrôle
   simple : au démarrage, l'agent affiche « État de gouvernance… ».

## Existant (vérifié le 2026-10-17)

- `README.md`, section « Installation » : une seule procédure pour dossier
  vide, projet existant et mise à jour ; « Good to know » dit que `init`
  active les hooks s'il trouve un dépôt git.
- Rien sur le redémarrage de session ni sur l'autorisation de
  l'auto-merge (`README.md`, README du paquet, recettes).
- Skill `/drwil-start`, étape 4 : vérifie déjà que la fusion est
  programmée (`gh pr view --json autoMergeRequest`) avant de revenir en
  SCOPING.
- Fiches voisines : premier essai propre (installation par l'URL de la
  release, même section du README) et sondage de lancement dans tous les
  cas (sans message `[drwil]`, la skill dit déjà de redémarrer la
  session), faits en 0.6.2, journal du 2026-10-17.

## Questions à trancher

- [décision] Où vit le guide : une section du README (source unique), ou
  un document à part, à créer, cité par le README ?
- [décision] Auto-merge refusé par le dépôt : seulement documenté, ou
  aussi détecté par `doctor` et dit par la skill de lancement ?
- [décision] La protection de branche : seulement documentée ici, sa
  vérification relevant de `docs/intentions/forge-dans-le-livrable.md` ?
