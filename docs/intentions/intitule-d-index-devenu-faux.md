# Intention : détecter un intitulé d'index ou un paragraphe de version devenu faux

**Statut** : proposée le 2026-10-21 — limite non traitée de la clôture « la clôture vérifie la cohérence de la documentation » (journal du 2026-10-21).

## Besoin

La clôture refuse désormais une case contredisant le statut de sa fiche, mais
pas un intitulé d'index devenu faux (« 4 sur 5 » alors que la version a été
réduite à trois outils), ni le paragraphe d'une version de l'index qui ne suit
plus ses cases. Ces écarts sont de la prose : aucune règle sûre ne les détecte
aujourd'hui.

## Existant (relevé le 2026-10-21)

- `.githooks/doc-coherence.mjs` ne lit que les cases, les statuts de fiche,
  les références mortes et les citations de fiche dans le code.
- Les cas rencontrés le 2026-10-19 sont restés à la vigilance de l'agent.

## Questions à trancher

- Un format structuré (compteur ou liste de cases rattachées à une version) rendrait-il l'écart détectable sans heuristique ?
- Un avertissement à la clôture, ou un contrôle bloquant ?
