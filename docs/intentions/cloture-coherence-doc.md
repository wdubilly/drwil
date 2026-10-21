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

## Décisions du demandeur (2026-10-21)

- [décision prise] Tout devient bloquant à la clôture : les écarts de
  QUA-015 (case cochée / statut de la fiche) et de QUA-049 (citations de
  fiche dans du code non modifié) passent d'avertissement à bloquant, au moment
  de clore. Conséquence : ces deux contrats existants sont modifiés.
- [décision prise] Où : dans `.githooks/close.mjs` (clôture et `--check`), en
  réutilisant les règles de `check-docs`, sans les dupliquer.
- [décision prise] Doublon d'intention : un avertissement quand une nouvelle
  intention cite un chemin déjà cité par une autre, sans mots clés.
- [décision prise] Coût : tout l'index à chaque clôture.
- [décision prise] Corriger, pas seulement bloquer : la clôture propose
  chaque correction (liste ou diff) et l'applique seulement avec `--fix` ;
  corrigés ainsi : cases de l'index alignées sur le statut de la fiche,
  références mortes supprimées ou réorientées vers le journal.
- [décision prise] Référence morte : réorientée vers le journal quand elle
  vise la fiche du chantier qui se clôt, supprimée sinon. Citation de fiche
  voulue : aucune exception. Intitulé d'index devenu faux : hors de ce
  chantier, reste une limite (non détectable de façon sûre).
- Ordre : ce chantier passe avant « une note de recette conservée dans le
  dépôt ».

## Questions à trancher

- Le message de clôture unique : ne pas empiler ce signal avec le chemin
  restant jusqu'à CLOSING (QUA-073).
- Le traitement des avertissements QUA-015 et QUA-049 déjà présents dans le
  dépôt (cinq cases cochées de `suites-kit-portable`, neuf citations de fiche
  dans du code non modifié) : à corriger avant de les rendre bloquants.

- Lien : la clôture dit déjà quelle étape suit (QUA-073, chemin restant jusqu'à
  CLOSING) : à cadrer avec elle pour ne pas empiler deux messages de clôture.
