# Intention : la clôture signale aussi les citations d'une intention retirée

**Statut** : proposée le 2026-10-19 — écart relevé pendant le chantier
« les branches fusionnées par squash reconnues » (journal du 2026-10-19,
0.6.6, 2 sur 4).

## Besoin

À la clôture, `node .githooks/close.mjs --check` signale les références à
la fiche qui deviendraient mortes (QUA-048, une clôture en un geste), mais
pas celles à l'intention d'origine qu'on retire quand elle est couverte.
Le 2026-10-19, deux anciennes entrées du journal citaient l'intention
retirée : `--check` disait « Rien ne ferait échouer la clôture », puis le
commit de clôture a été refusé par check-docs (chemin introuvable).

## Existant (vérifié le 2026-10-19)

- `.githooks/close.mjs` (`closingSignals`) : cherche les citations de la
  fiche active seulement.
- L'intention d'origine est connue (champ `**Intention**` de la fiche).

## Questions à trancher

- [décision] Signaler aussi les citations de l'intention d'origine (« si
  vous la retirez, ces lignes deviendront mortes »), ou laisser check-docs
  les attraper au commit ?
