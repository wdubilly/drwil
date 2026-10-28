# Intention : retirer le `judgeGuarantees` mort de `packages/drwil/src/guarantees-verify.ts`

**Statut** : proposée le 2026-10-28 — limite relevée à la clôture de `niveau-de-protection`.

## Besoin

Le chantier a redéfini `judgeGuarantees` dans `packages/drwil/src/guarantees.ts`
(il ajoute l'échec de la barrière non bloquante, QUA-156) ; `packages/drwil/src/verify.ts`
importe cette version. L'ancienne, dans `packages/drwil/src/guarantees-verify.ts`, n'est
plus appelée : deux juges au même nom, dont un mort, risquent de diverger.

## Existant (relevé le 2026-10-28)

- `packages/drwil/src/guarantees-verify.ts` (ligne 41) exporte `judgeGuarantees`, sans appelant.
- `packages/drwil/src/guarantees.ts` (ligne 126) exporte celui qu'utilise `packages/drwil/src/verify.ts`.
- Le fichier `packages/drwil/src/guarantees-verify.ts` existe peut-être pour tenir le plafond de
  taille (QUA-001) : non vérifié.

## Questions à trancher

- [décision] Supprimer l'ancien juge, ou le garder dans `packages/drwil/src/guarantees-verify.ts` et
  y déplacer la nouvelle version, si la taille de `packages/drwil/src/guarantees.ts` l'exige ?
