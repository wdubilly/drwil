# Intention : la place de la marque [humain] ne change jamais l'empreinte des critères acceptés

**Statut** : noté le 2026-11-14, demande du demandeur après deux occurrences le même jour ; cadré le 2026-11-14 dans `docs/projects/marque-humain-et-empreinte-des-criteres.md` (D1 : marque effacée avant la preuve, sans place imposée ; D2 : ancienne empreinte relue en repli).

## Besoin

Les critères d'acceptation acceptés au lancement sont figés par leur empreinte (QUA-174) : un critère modifié ensuite
refuse la clôture. La marque `[humain]` ne devrait pas compter : c'est une classification, pas un changement de sens.
Or sa **place** change l'empreinte. Écrite entre le tiret et l'identifiant de preuve (« — [humain] `QUA-013` »), elle
empêche de reconnaître la preuve de fin de ligne, qui entre alors dans le texte accepté ; l'ajouter, la retirer ou la
déplacer ensuite change l'empreinte, et la clôture refuse. Le demandeur veut que cette friction disparaisse.

## Existant (2026-11-14)

- `.githooks/state-acceptance.mjs`, `criteriaFingerprint` : `PROOF_TAIL` (une preuve de fin de ligne commence par le
  tiret suivi directement de « contrat à créer » ou d'un identifiant entre accents graves) est retiré **avant**
  `HUMAN_MARK` (qui efface `[humain]`). Avec la marque entre le tiret et l'identifiant, `PROOF_TAIL` ne reconnaît rien ;
  la marque est effacée ensuite, mais la preuve reste dans le texte normalisé.
- Occurrence 1 (chantier « attestations qui tombent pour leur objet », PR #428) : `[humain]` ajouté entre le tiret et
  l'identifiant, clôture refusée ; contourné en plaçant la marque en tête du critère.
- Occurrence 2 (chantier « un seul run de couverture », PR #430) : un critère accepté sous la forme
  « — [humain] `QUA-013` » ; retirer la marque (verify la refusait, QUA-013 étant entièrement automatisé) a changé
  l'empreinte et demandé au demandeur une nouvelle acceptation au terminal (`node .githooks/state.mjs accept`).

## Questions à trancher

- Effacer la marque avant de retirer la preuve (ou laisser `PROOF_TAIL` accepter une marque entre le tiret et
  l'identifiant) : l'empreinte ne dépend plus ni de la présence ni de la place de la marque.
- Changer la normalisation change l'empreinte des critères d'un chantier en cours accepté avant la livraison : relire
  l'ancienne empreinte en repli, ou exiger qu'aucun chantier ne soit en cours au moment de la mise à jour ?
- La marque doit-elle avoir une place unique, signalée dès le cadrage par `check-docs`, en plus de l'insensibilité ?
