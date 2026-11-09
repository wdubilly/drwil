# Intention : retirer `drwil-progress`, maintenant que `drwil serve` est à parité

**Statut** : à cadrer — notée le 2026-11-08, retirée du chantier `drwil-serve` à la demande du demandeur, qui préfère une PR
plus petite. Priorité proposée : P2.

## Besoin

`drwil serve` montre tout ce que montrait le tableau de bord statique : les deux vues coexistent, et l'ancienne n'est plus
la référence. Reste à retirer le module `optional/dashboard`, le skill `view-progress`, sa recette et leurs références,
dont `/drwil-progress` au menu du skill `drwil`, à faire passer QUA-198 (tendance de la durée de la CI et du cache lu) sur
`drwil serve`, et à migrer les projets déjà équipés.

## Existant

Constaté sur le code le 2026-11-08 :

- `removeObsolete` retire le skill, mais une recette est protégée (`isProtected`, QUA-027 : mise à jour sûre).
- `.githooks/dashboard.mjs`, `.githooks/dashboard-read.mjs` et `.githooks/dashboard-texts.mjs` sont copiés à la main chez un
  projet équipé et absents du manifeste : leur état d'origine n'est pas connu.
- Les ajouter à `OLD_KIT_FILES` ferait passer tout projet équipé pour un projet à l'ancien format (`oldFormat`), lecture
  du code non essayée. Écrire la suppression dans `packages/drwil/src/cli-install.ts` ou `packages/drwil/src/config-write.ts`
  serait un contournement : hors de l'aperçu `--dry-run` et du commit de mise à jour (QUA-237).

## Décisions déjà prises par le demandeur, le 2026-11-08

- Une table `RETIRED` dans `packages/drwil/src/migration-table.ts` et une boucle à part dans `packages/drwil/src/migration.ts`,
  qui ne déclenche pas `oldFormat`, visible dans `--dry-run` et le commit de mise à jour.
- Les trois hooks ci-dessus sont toujours retirés à la mise à jour, même modifiés ; le message de migration le dit.
- Pas d'exception à QUA-027 : `docs/recipes/view-progress.md` reste chez un projet déjà équipé, signalée par le message de
  migration. Limite assumée : elle y décrit une commande retirée.

## Questions à trancher

- La page HTML que générait le tableau de bord, sortie ignorée par Git : proposé, la laisser et la signaler.
- Le retrait modifie des hooks : puces « Contrats modifiés » sur le oui du demandeur (QUA-137 : hook modifié non déclaré).
