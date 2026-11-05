# Intention : traiter les limites pendant le chantier, pas en fiches d'intention à la clôture

**Statut** : proposée le 2026-11-05, cadrée le même jour : `docs/projects/limites-pendant-le-chantier.md`.

## Besoin

À la clôture, chaque limite non traitée devient une fiche d'intention (QUA-036 : la clôture boucle
les intentions). Le demandeur voit ces fiches s'accumuler alors que plusieurs limites auraient pu
être traitées dans le chantier même, contexte encore chargé. Il veut qu'une limite dans le cadre de
la fiche se traite sur le champ, et qu'une limite hors cadre lui soit soumise avant la vérification :
« traiter maintenant » (cadrage élargi sur son oui) ou « noter ». La fiche d'intention ne naît plus
que d'un report choisi.

Exemple du 2026-11-05 (chantier « reprise sur un autre clone ») : le message d'aide de
`node .githooks/state.mjs` ne cite pas `resume`, faute d'une puce « Contrats modifiés » un peu plus
large ; la limite est partie en note au lieu d'être traitée.

## Existant (relevé le 2026-11-05)

- QUA-036 : à la clôture, chaque limite non traitée devient une fiche d'intention, écrite par l'agent
  seul ; la clôture refuse un chantier dont l'intention d'origine n'est pas touchée (QUA-074).
- Les sondages lus par un hook : lancement (`drwil-start`, `.claude/hooks/start-poll.mjs`), file
  (`drwil-file`, `.claude/hooks/queue-poll.mjs`), fin de cadrage (`drwil-scope`, QUA-187),
  attestation (`drwil-attest`, QUA-235) ; aiguillés par `.claude/hooks/prompt-hook.mjs`.
- Élargir le bloc `scope` d'une fiche active coûte un commit séparé, signalé par la barrière
  (`docs/ia-first/8-conduct-rules.md`, « Detour for a prior defect »).

## Questions à trancher

Toutes tranchées le 2026-11-05 (voir la fiche, section Décisions).
