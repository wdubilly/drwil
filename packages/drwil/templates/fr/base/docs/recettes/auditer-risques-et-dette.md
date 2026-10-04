# Recette : auditer risques, dette technique et écarts de specs

Objectif : détecter ce qui menace la stabilité, la sécurité ou la
maintenabilité du projet — dérive entre le cadrage et le code réel, code
mort, angles morts de sécurité, trous de tests — sans deviner : chaque
risque relevé doit pointer vers un fichier réel.

Contrairement au tableau de bord (`docs/recettes/visualiser-avancement.md`),
cette recette demande du jugement (comparer une intention à du code) : pas
de script, un prompt qui cadre la méthode pour l'IA.

## Entrées à lire (génériques, pas de chemin en dur)

Localiser les entrées via `.drwil/ia-first.json` plutôt que des noms fixes
(un éventuel docs/02-cadrage.md ou dossier src/ n'existent pas forcément
dans ce projet) :

1. **Cadrage et specs** : toutes les fiches de `dirs.projects`
   (`docs/projets/` par défaut), hors modèle (`modele-*`/`model-*`). Chaque
   fiche porte son Besoin, ses Décisions et ses Lots — c'est le cadrage
   réel à comparer au code.
2. **Invariants** : `dirs.contracts` (`docs/contrats.md` par défaut) — les
   règles que le code doit respecter, et `docs/catalogue-contrats.md` pour
   ce qui est proposé mais pas encore adopté.
3. **Code source** : les dossiers déclarés dans `layers` et
   `layerPrefixes`/`codePrefixes` de la config (pas un dossier src supposé
   d'office). Pour chaque couche, son `AGENTS.md` (s'il existe) donne les
   pièges connus et les contrats spécifiques à relire en premier.
4. **Tests** : les chemins marqués comme tels dans `layerPrefixes` (ex.
   `tests`, `e2e`) ou la convention de la pile détectée.

## Méthode

Chercher activement :
1. **Dérive de spec** : une fiche de `docs/projets/` décrit une règle
   métier ou un cas limite que le code ne respecte pas (ou qu'il traite
   différemment sans que la fiche ait été mise à jour).
2. **Code mort / orphelin** : fichiers ou dépendances non référencés par
   aucune fiche de cadrage, ni importés nulle part (`cadrage` en avertit
   déjà au commit pour le code hors fiche — QUA-016 — mais ne détecte pas
   le code mort à l'intérieur d'une fiche couverte).
3. **Angles morts de sécurité/stabilité** : absence de validation des
   entrées, secret en clair, appel API/DB sans gestion d'erreur.
4. **Trous de tests** : routine critique ou complexe citée dans une fiche
   de cadrage sans test associé.

## Sortie

Générer ou mettre à jour `docs/audit-risques.md` (à créer) à la racine du
projet, selon ce gabarit :

```markdown
# Audit de risques et dette technique

> Dernier scan : AAAA-MM-JJ
> Niveau de santé global : 🔴 Critique / 🟠 Fragile / 🟢 Stable

## Aperçu de consommation

(si .drwil/usage.jsonl existe : tokens et minutes cumulés, modèles
employés depuis le dernier scan — lire `docs/recettes/suivre-consommation-par-lot.md`.
Sinon, omettre cette section plutôt que d'inventer un chiffre.)

## Synthèse

| ID | Risque | Catégorie | Gravité | Fichiers concernés | Action proposée |
|---|---|---|---|---|---|
| RSK-1 | ... | Spec Drift / Code mort / Sécurité / Tests | 🔴/🟠/🟡 | `chemin/réel` | ... |

## Détail des risques majeurs

### RSK-1 — titre
- **Attendu** (fiche citée) : ...
- **Codé réellement** (fichier cité) : ...
- **Risque encouru** : ...
- **Correctif recommandé** : ...

## Prochaine étape

Choisir un ID et répondre : « Corrige RSK-X ».
```

## Garde-fous

- Chaque ligne RSK-N doit citer une fiche réelle de docs/projets/ et/ou
  un fichier de code réel — jamais une affirmation sans preuve.
- « Corrige RSK-X » ne doit pas déclencher de code sans fiche : si le
  correctif touche du code non déjà couvert par une fiche de cadrage,
  créer d'abord une fiche (sous `dirs.projects` ou `dirs.intentions`) avant
  de corriger — cohérent avec QUA-016.
- Audit déclenché à la main, jamais en CI ni au commit (comme le tableau de
  bord).
