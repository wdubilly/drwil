# Intention : éprouver les gardes de lecture et le sous-agent dans une vraie session Claude Code

**Statut** : proposée le 2026-10-24 — limite du chantier « réduire le contexte
relu par chantier ».

## Besoin

QUA-132 (registre et journal jamais lus en entier avec Claude Code) et
QUA-129/QUA-130 (sous-agent `drwil-checks` qui ne renvoie que le verdict
recopié mot pour mot) sont prouvés par des tests qui rejouent les hooks avec
des entrées simulées et lisent les fichiers livrés, comme QUA-072 (les hooks
et skills de Claude Code ne changent pas, prouvé sans session réelle). Aucune
vraie session Claude Code n'a été rejouée.

## Existant (relevé le 2026-10-24)

- Le refus de `cat` est jugé sur le texte de la commande
  (`docs/intentions/garde-shell-par-le-texte.md`).
- Faux positif constaté à la clôture : `cat >> docs/projects/journal.md <<EOF`
  (ajout en fin de fichier, une écriture) est refusé comme une lecture.
- Le banc des agents (QUA-060, un outil n'est tenu que prouvé par le banc) sait lancer une vraie session.

## Questions à trancher

- Ajouter au banc un scénario « lire le registre en entier » (refus attendu,
  renvoi vers `.githooks/glossary.mjs`) et un passage par le sous-agent ?
- Laisser passer `cat` quand le fichier gardé n'est que la cible d'une
  redirection (`>`, `>>`) ?
