# Intention : le coût d'un chantier se répartit entre production, vérification et gouvernance

**Statut** : cadrée le 2026-11-13 — `docs/projects/cout-par-activite.md`.

## Besoin

drwil ne produit pas que du code : il produit aussi des garanties. Avant de chercher à réduire la consommation, il
faut savoir ce qu'elle finance. Trois parts à mesurer, chantier par chantier :

1. **Production** : ce que coûte la fonctionnalité livrée (BUILD : lire, coder, tester en écrivant).
2. **Vérification** : ce que coûte la preuve qu'elle fonctionne (EVIDENCE, VERIFY, rejeux après un FAIL, CI suivie).
3. **Gouvernance** : ce que coûtent le cadrage, les décisions humaines (sondages, limites, attestations), les
   contrats et la clôture (CLOSING, réouvertures).

Hypothèse à vérifier, pas à présumer : une part importante des tokens finance la gouvernance et la fiabilité. On la
mesure sur quelques chantiers avant toute optimisation.

Écarté de la proposition : les notes qualitatives sur 85 points (jugement sur un résumé, non reproductible) et les
comparaisons d'efficacité entre chantiers tant que la répartition n'est pas mesurée (sortie, durée et tokens
totaux ne disent pas où va le coût).

## Existant

Relevé le 2026-11-13.

- `.githooks/consumption.mjs` lit les journaux de Claude Code et `node .githooks/close.mjs` écrit une ligne par
  chantier dans `.drwil/usage.jsonl` : `tokens`, `input`, `output`, `cache_read`, `cache_write`, `requests`,
  `model`, `duration_min`, `date`, `source`, avec `increment` à `all` — un total, aucune répartition par activité.
- Ordres de grandeur (même fichier) : `support-gitlab-merge-auto` 5 M tokens pondérés, 342 requêtes, 119 min ;
  `lancement-refuse-dit-pourquoi` 3,2 M, 227 requêtes, 100 min ; `ci-multi-os-a-la-release` 2,8 M, 197 requêtes,
  56 min (dont une réouverture). Rien ne dit quelle part de ces totaux est production, vérification ou gouvernance.
- L'état de gouvernance connaît l'activité courante (SCOPING, BUILD, EVIDENCE, VERIFY, CLOSING) et ses transitions
  (`.githooks/state-transitions.mjs`) : c'est le découpage naturel des trois parts.
- `docs/intentions/campagne-mini-banc.md` (critère C5) mesure le coût de la gouvernance par comparaison avec et sans
  drwil, sur un banc ; pas sur les chantiers réels du dépôt.
- Les décisions humaines d'un chantier ne sont pas comptées (sondages de lancement, de limites, d'attestation, de
  fusion) ; la journée du 2026-11-12 en a demandé environ deux par chantier.

## Questions à trancher

1. Découper par activité de l'état (horodatage des transitions croisé avec les requêtes des journaux) suffit-il, ou
   faut-il une part « décisions humaines » distincte de la gouvernance ?
2. Où écrire la répartition : nouveaux champs de la ligne de `.drwil/usage.jsonl` (rétrocompatible pour le tableau
   de bord) ou lignes par activité (`increment`) ?
3. Combien de chantiers mesurés avant de conclure sur l'hypothèse, et quel seuil déclencherait une optimisation ?
4. Les autres outils (Copilot CLI, Gemini) : même découpage quand leur consommation sera mesurée
   (`docs/intentions/consommation-autres-outils.md`) ?
