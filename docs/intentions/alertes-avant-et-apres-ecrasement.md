# Intention : alerter avant et après un écrasement par la mise à jour

**Statut** : proposée le 2026-10-26.

## Besoin

Sur drwil_dbox, la montée en 0.9.0 a supprimé des morceaux du projet (étape
CI, job Windows, tableau des fiches) sans que rien ne le signale :
`drwil doctor` répondait « Healthy installation ». Le demandeur veut être
prévenu avant l'écrasement et après, quand une installation est saine
seulement en apparence.

## Existant

Relevé le 2026-10-26 à l'usage sur drwil_dbox : `resolve-drift` montre un
diff et demande confirmation, sans dire explicitement qu'il supprime des
jobs ou des étapes absents du gabarit. `doctor` ne signale ni une stack
vide, ni des fichiers `.bak` laissés après une résolution de dérive.

## Questions à trancher

- [décision] `resolve-drift` doit-il compter et nommer les jobs, étapes et
  lignes de projet qu'il supprime, et exiger une confirmation distincte ?
- [décision] `doctor` doit-il avertir d'une stack vide et d'un `.bak`
  présent ?
- [décision] Ce besoin se traite-t-il avec l'intention
  `docs/intentions/detection-de-stack-elargie.md` (stack vide signalée) ?
