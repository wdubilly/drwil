# Intention : proposer la couche d'un dossier de code apparu après l'installation

**Statut** : proposée le 2026-10-19 — question de l'humain sur le déploiement de la doc de couche.

## Besoin

Quand une techno est choisie et qu'un dossier de code apparaît (par exemple
`backend/`) après l'installation, sa couche (`AGENTS.md` de couche et consignes
par outil) doit être proposée, au lieu de rester absente sans que personne le
voie.

## Existant (vérifié le 2026-10-19)

- Dossier avec du code à l'installation : `drwil init` détecte la stack par
  sous-dossier et écrit chaque couche (`packages/drwil/src/install.ts`).
- Dossier vide ou projet neuf : aucune couche inventée (QUA-038) ; elles se
  déclarent au cadrage (`/drwil-adopt`) ou avec `drwil init --layers`.
- Trou : un dossier de code créé ensuite, sans repasser par `/drwil-adopt` ni
  `--layers`, n'a pas de couche, et rien ne le détecte ni ne le signale.

## Questions à trancher

- [décision] Où détecter : au commit (hook), dans `drwil doctor`, dans le
  rappel d'état en début de tâche, ou dans `verify` ?
- [décision] Signal ou blocage : un avertissement, ou un contrôle bloquant
  quand un dossier de code n'a pas de couche déclarée ?
- [décision] Qui crée la couche : l'agent propose et l'humain valide, ou
  `drwil init` la crée seul pour la stack détectée ?
- [décision] Que faire d'un dossier détecté mais volontairement sans couche
  (exclusion déclarée dans `.drwil/ia-first.json`) ?
