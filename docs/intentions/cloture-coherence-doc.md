# Intention : la clôture vérifie la cohérence de la documentation, de façon bloquante

**Statut** : proposée le 2026-10-19 — demande de l'humain, après « Gemini CLI tenu » et la réduction du périmètre de la 0.6.7 (journal du 2026-10-19).

## Besoin

À la clôture d'un chantier, la cohérence entre l'index, les fiches, les
intentions, le journal et les versions repose sur des avertissements, que
personne n'est obligé de lire, et sur la vigilance de l'agent. Une vraie
vérification de cohérence à la clôture, avec des contrôles bloquants à la
place des avertissements, éviterait des erreurs qui passent aujourd'hui.

## Existant (vérifié le 2026-10-19)

- `.githooks/check-docs.mjs` tourne à chaque commit : chemins et contrats
  cités (bloquant), cohérence case cochée / statut de la fiche (QUA-015,
  avertissement), citations de fiche dans du code non modifié (QUA-049,
  avertissement).
- QUA-036 (la clôture boucle les intentions) signale en avertissement une
  fiche supprimée dont l'intention n'est pas touchée, en ne regardant que le
  commit de clôture.
- QUA-040 vérifie la carte d'architecture et le changelog.

## Trous rencontrés (2026-10-19)

- Un intitulé devenu faux : « 4 sur 5 » et « 5 sur 5 » après la réduction de
  la 0.6.7 à trois outils.
- Le paragraphe d'une version de l'index qui ne suit plus ses cases.
- Une intention presque recréée alors qu'elle existait déjà
  (`docs/intentions/consommation-autres-outils.md`).
- Un renvoi vers une fiche supprimée, vu seulement parce qu'un chemin cité
  devenait introuvable.

## Questions à trancher

- [décision] Quelles incohérences deviennent bloquantes à la clôture, et
  lesquelles restent des avertissements (l'écart avec QUA-015 et QUA-049 est
  aujourd'hui un choix de faible friction) ?
- [décision] Où le vérifier : dans `.githooks/close.mjs` (au moment de
  clore), dans `check-docs` (à chaque commit), ou dans les deux ?
- [décision] Comment détecter un doublon d'intention sans heuristique
  fragile (titre, chemin cité, mots clés) ?
- [décision] Comment garder le coût bas : seulement les fichiers touchés par
  le chantier, ou tout l'index à chaque clôture ?
- Lien : `docs/intentions/cloture-chemin-guide.md` (la clôture dit quelle
  étape suit), à cadrer avec elle pour ne pas empiler deux messages de clôture.
