# Intention : donner à l'agent toutes les voies possibles quand il se croit bloqué

**Statut** : proposée le 2026-11-23 — demande du demandeur, relevée pendant le chantier « acceleration-des-controles ».

## Besoin

Quand un agent se croit bloqué, un contrôle qui échoue, une attestation humaine attendue, une transition réservée, un périmètre refusé, il doit recevoir d'un coup toutes les voies qui s'offrent à lui, au lieu de s'arrêter sur la première ou de proposer une seule issue. Il choisit ou les soumet à l'humain, jamais en contournant le contrôle (QUA-019, pas de contournement d'un contrôle).

## Existant (relevé le 2026-11-23)

- `node packages/drwil/bin/drwil.js verify --agent` finit par « Human attestation required » et une seule consigne (`drwil attest-poll`, puis le terminal en repli) ; il ne dit pas les autres issues : faire d'abord l'essai demandé par le contrat, retirer ou relier un critère mal étiqueté, élargir le cadre par le sondage des limites.
- Les barrières (périmètre, clôture, détour) refusent avec leur propre message, chacune pour son cas ; aucune ne liste les autres voies licites.
- Constat du chantier : à la fin de `verify`, l'agent a rendu cinq blocages dans un ordre qui ne disait pas lesquels il pouvait lever seul, lesquels demandaient une décision humaine, et lesquels demandaient un essai réel.

## Cas relevés (récit du demandeur, 2026-11-23)

Un agent s'est cru bloqué trois fois ; une seule était un vrai blocage.

1. **CI rouge de la MR !70 (faux blocage)** : `node .githooks/close.mjs --check` signalait deux hooks non déclarés et une CI rouge ; l'agent a cru les premiers cause du rouge. Le log montrait des tests instables (vitest, puis un e2e) : verts en local, branche principale verte, CI repassée au vert au troisième essai sans changement. Voie manquante : « lire d'abord le log avant d'accuser le signalement voisin ; rejouer ».
2. **Pre-commit de clôture (vrai blocage)** : le commit de clôture était refusé, un test e2e vu comme « hors de tout brief », car le contrôle ne lit que les suppressions de brief déjà commitées, alors que celle de la clôture n'est qu'indexée ; `close.mjs --check` annonçait pourtant que rien n'échouerait. Cause restée une hypothèse. Voie manquante : un détour (`node .githooks/detour.mjs open <nom> --title <défaut>`) et le geste humain qui l'autorise, annoncés dès le refus.
3. **« Aucun geste ne marche depuis CLOSING » (erreur de l'agent)** : il a déclaré `detour open`, `move BUILD` et `reopen` tous impossibles. `reopen` exige un arbre propre mais ne restaure le brief que s'il manque dans HEAD, et il y était encore. Le demandeur a vu la sortie : mettre la clôture de côté (stash), puis `reopen`, du premier coup. Voie manquante : le refus de chaque geste dit sa condition exacte (arbre propre) et ce qui la lève.

Autres erreurs relevées : un chiffre (40 min « normal ») donné sans l'avoir vérifié, et un suivi de CI promis qui n'existait plus. Dans les trois cas, l'agent a corrigé après coup.

Leçon : l'agent conclut « bloqué » sur une lecture partielle d'un refus. Il lui faut, au moment du refus, la liste des gestes possibles avec la condition de chacun.

## Questions à trancher

- [décision] Une seule sortie standard (un bloc « voies possibles » à la fin de chaque refus) ou un outil que l'agent lance quand il se croit bloqué ?
- [IA] Par type de blocage, quelles voies : corriger le code, relier ou rectifier un critère, noter une intention, ouvrir un détour, soumettre un sondage à l'humain ; lesquelles sont à l'agent, lesquelles à l'humain ?
- [IA] Chaque refus de geste (`reopen`, `detour open`, `move`) dit-il sa condition exacte et ce qui la lève (arbre propre, stash) ?
- [IA] Un refus rappelle-t-il de lire le log avant d'accuser un signalement voisin, et de rejouer un test instable ?
- [IA] Comment garantir que la liste ne propose jamais un contournement (`--no-verify`, contrôle désactivé) ?
