# Intention : une limite découverte en chantier dit son lien avec le problème, et l'élargissement se compte

**Statut** : cadrée le 2026-11-13 — `docs/projects/limites-classees-par-lien.md`.

## Besoin

Un chantier part d'un problème précis puis découvre des défauts voisins. Les traiter est utile quand ils tiennent
au problème ; sinon chaque chantier devient l'occasion de tout corriger autour de lui : plus de contexte consommé,
plus de fichiers touchés, plus de cycles de vérification, plus de risque de régression, une clôture plus longue.
Garder la possibilité, mais lui donner une limite lisible et mesurable.

Trois catégories pour chaque découverte hors cadre :

| Catégorie | Critère | Traitement présenté d'abord |
|---|---|---|
| bloquant | le chantier ne peut pas aboutir sans (commit ou contrôle refusé, critère inatteignable) | Traiter maintenant |
| lié | même cause ou même défaut que le problème du chantier | Traiter maintenant si le périmètre reste maîtrisé |
| périphérique | tout le reste | Noter en intention (nouveau chantier) |

La catégorie est posée par l'agent, appuyée sur un fait (« le commit est refusé par… », « même fonction que la
cause racine… ») ; la décision reste celle de l'humain, au sondage, sans recommandation.

Mesure sans blocage : l'entrée du journal de chaque chantier compte ses élargissements de périmètre (fichiers
ajoutés au bloc scope, catégorie de chaque limite, décision). Pas de plafond dur : il ralentirait sans preuve
d'utilité ; le chiffre dira plus tard s'il en faut un.

## Existant

Relevé le 2026-11-13.

- Une limite dans le cadre se traite sur le champ ; une limite hors cadre est soumise à l'humain par le sondage
  `drwil-limite` (« Traiter maintenant » / « Noter en intention »), à la fin de BUILD et avant VERIFY :
  `docs/ia-first/8-conduct-rules.md`, `docs/ia-first/7-starting-and-closing.md`, hook
  `.claude/hooks/limit-poll.mjs`, état `.githooks/state-limits.mjs`, clôture `.githooks/close-limits.mjs`.
- Le sondage ne dit pas le lien de la limite avec le problème : toutes arrivent pareilles.
- Journée du 2026-11-12 : 8 limites traitées sur le champ en deux chantiers. Bloquantes : la sortie figée du test de
  QUA-072 (commit refusé), `.githooks/state-cli.mjs` (cause racine) ; périphérique : `.githooks/wait-command.mjs`
  (signalée « non bloquante », traitée quand même : un fichier de plus, une puce « Contrats modifiés », un cycle
  de vérification). L'analyse de valeur du même jour compte 72 commits d'élargissement du périmètre depuis le
  2026-10-22, sans aucun chiffre tenu à la clôture.

## Questions à trancher

1. La catégorie est-elle un champ lu par le hook (refus d'un sondage sans catégorie) ou seulement une consigne
   dans le texte de la question ?
2. Le compte des élargissements est-il écrit par `node .githooks/close.mjs` (mesuré sur le bloc scope de la fiche
   entre lancement et clôture) ou rédigé dans l'entrée du journal ?
3. Faut-il un seuil d'alerte (pas de blocage) au-delà d'un nombre de fichiers ajoutés, une fois quelques chantiers
   mesurés ?
