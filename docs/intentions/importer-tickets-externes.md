# Intention : importer des tickets (Jira ou autre) en intention/cadrage

**Statut** (2026-10-05) : en attente — idée posée par l'utilisateur, questions
à trancher non encore tranchées.

## Besoin
Un ticket déjà écrit ailleurs (Jira, ou un autre outil de suivi) décrit
souvent un besoin de façon proche d'une fiche `docs/intentions/` ou
`docs/projets/` (titre, description, parfois critères d'acceptation).
Le retaper à la main dans le format du kit est une perte de temps et un
risque de perdre un détail en cours de route. Objectif : pouvoir importer
un ticket existant et en dériver automatiquement (ou semi-automatiquement)
une fiche d'intention ou de cadrage conforme au format du kit, sans tout
réécrire à la main.

## Existant
- Fiches d'intention (`docs/intentions/`) et de cadrage
  (`docs/projets/`) au format Markdown avec sections fixes, vérifiées
  par `.githooks/check-docs.mjs` (sections obligatoires, Statut daté,
  marqueurs `[IA]`/`[humain]`/`[décision]` sur chaque case ouverte).
- Aucun mécanisme d'import depuis un outil externe aujourd'hui : toute
  fiche est écrite à la main (par un humain ou une IA, sur demande).

## Questions à trancher
1. Quel(s) outil(s) cibler en premier ? Jira seul, ou aussi GitHub
   Issues/GitLab Issues/Linear/Trello ? (Jira a une API REST stable et
   bien documentée — le plus simple à couvrir en premier si retenu.)
2. Authentification : jeton API Jira personnel (email + token) à fournir
   par l'utilisateur à chaque import, ou configuration persistante
   (où stocker le jeton sans le committer — risque de secret, voir
   contrat sécurité du catalogue) ?
3. Import ponctuel à la demande (« importe le ticket DRWIL-123 ») ou
   suivi continu (synchronisation régulière, détection de tickets
   nouveaux) ? Le second est nettement plus complexe (états à
   réconcilier, doublons, tickets mis à jour après import).
4. Mapping champs ticket → sections de la fiche : un résumé de ticket
   suffit-il pour remplir « Besoin », ou faut-il aussi les commentaires,
   les sous-tâches, les pièces jointes ?
5. Le résultat de l'import est-il toujours une fiche *brouillon* à
   relire et compléter par un humain (cadrage encore à trancher), ou
   peut-il arriver déjà entièrement cadré si le ticket est assez
   détaillé ?
6. Faut-il un lien de traçabilité retour (ID du ticket cité dans la
   fiche, voire mise à jour du ticket une fois le chantier clôturé) ?

## Périmètre (à affiner une fois les questions tranchées)
- Un script (ou skill) qui, à la demande, récupère un ticket via l'API
  de l'outil choisi et génère une fiche `docs/intentions/` pré-remplie
  (sections vides ou best-effort selon le contenu du ticket).
- Documentation (recette) de l'usage.

## Hors périmètre (pour l'instant)
- Synchronisation continue/bidirectionnelle avec l'outil externe.
- Tout outil autre que celui retenu en premier (question 1).
- Écriture automatique dans l'outil externe (commentaire, changement de
  statut) sans action explicite de l'utilisateur.

## Contraintes / risques
- Un jeton d'API est un secret : ne jamais le committer, ne jamais
  l'afficher dans une sortie d'outil (contrainte déjà posée par
  `AGENTS.md` de ce dépôt, pas spécifique à ce chantier).
- Dépendant de l'outil choisi : faisabilité "facile" à confirmer une
  fois l'outil et le mode (ponctuel vs continu) tranchés — un import
  ponctuel via l'API Jira est probablement simple, une synchronisation
  continue beaucoup moins.
