# Intention : un contrôle exigé qui n'a pas tourné ne se rapporte jamais comme réussi

**Statut** : proposée le 2026-11-09 — issue d'une analyse externe de la gouvernance, relevés à vérifier avant tout cadrage.

## Besoin

Le principe du kit est « non exécuté ne vaut jamais réussi » (QUA-013). Vue de la forge, deux sauts le contredisent :
les jobs `kit-tests` sous Windows et macOS d'une PR sont rapportés réussis sans exécuter les tests, et sur la
branche principale le contrôle `checks` se termine en quelques secondes quand l'arbre a déjà été prouvé par une PR.
Le demandeur veut que la forge voie « non exécuté » (ou que le job sauté ne porte pas le nom d'un contrôle exigé).

## Existant

Relevé par l'analyse externe du 2026-11-09, non revérifié dans le code : sauts assumés et documentés. Les gabarits
CI et la reprise de verdict d'une PR à l'autre (livrée en 0.11.1, contrats QUA-288 à QUA-291) sont les points à relire.

## Questions à trancher

- [décision] Le saut se dit-il dans le verdict (statut « non exécuté ») ou par un nom de job différent de celui que la
  forge exige ?
- [décision] Quel statut une reprise de verdict d'une PR à l'autre doit-elle porter, pour ne pas se confondre avec une passe ?
- [décision] Windows et macOS : jouer les tests, ou ne plus les exiger sous le nom `kit-tests` ?
