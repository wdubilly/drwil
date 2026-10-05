# Chantiers en attente — index

Une ligne par sujet. Le détail et le **statut** vivent dans la fiche liée,
seule source : cet index ne recopie aucun état. Un sujet sans lien tient en
deux lignes ici. Les idées non cadrées : `docs/intentions/README.md`. Règles
d'écriture : `docs/ia-first.md`, section 7.

Marqueur obligatoire sur chaque case ouverte (QUA-015) : `[IA]` faisable par
un agent dans le dépôt ; `[humain]` geste hors du dépôt (serveur, coffre,
accord, infrastructure) ; `[décision]` à trancher par le demandeur avant tout
travail. Un agent ne tente pas un geste `[humain]` et ne tranche pas une
`[décision]` : il la pose. Les petites tâches qui ne justifient pas un
chantier : `docs/projets/entretien-courant.md`.

Priorité facultative, non vérifiée par check-docs.mjs (simple convention) :
`[P0]` le plus urgent, `[P1]` élevée, `[P2]` normale, `[P3]` le moins urgent.
Sans tag, un sujet est considéré `[P2]`.

Un chantier dont la fiche est **entièrement** terminée (pas un simple point
parmi d'autres) est condensé dans `docs/projets/journal.md` puis retiré de
cet index, pas coché : voir `docs/recettes/travailler-en-branche.md`,
section « Clôturer ». Les lignes cochées restantes concernent des points
déjà faits d'une fiche qui reste ouverte par ailleurs.

## Chantiers

*(vide à l'installation — une section par thème, une case par sujet)*

<!-- Exemple :
- [ ] [IA] titre court du sujet, renvoi à une fiche si plus de deux lignes
  à dire, sinon le sujet tient ici.
- [x] sujet livré (AAAA-MM-JJ).
-->
