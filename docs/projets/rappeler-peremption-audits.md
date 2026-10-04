# Projet : rappeler quand un audit (opportunité, risques) est périmé

**Statut** (2026-10-04) : cadré — lot 1 prêt à démarrer sur confirmation.

<!-- cadrage
fichiers:
  - .githooks/tableau-de-bord.mjs
  - .githooks/run-checks.mjs
-->

## 1. Besoin

Les audits d'opportunité (`docs/decouverte-valeur.md`) et de risques/dette
(`docs/audit-risques.md`) ne sont jamais déclenchés automatiquement : ce
sont des prompts IA (recettes `docs/recettes/decouvrir-valeur-produit.md`
et `docs/recettes/auditer-risques-et-dette.md`), lancés à la main. Rien
n'indique quand ils deviennent périmés — un utilisateur qui ne pense pas à
les relancer ne reçoit aucune proposition d'amélioration spontanée, même
après des semaines d'évolution du code.

Le tableau de bord (`.githooks/tableau-de-bord.mjs`) affiche déjà la date
du dernier scan de chaque audit (bloc citation en tête de rapport,
fonction `lireAudit()`), mais ne la compare jamais à la date du jour.

## 2. Hors périmètre

- Déclencher l'audit lui-même automatiquement (lancer l'IA sans
  demande) : écarté en discussion — la génération reste un geste IA
  explicite, pas un script (jugement produit, pas un calcul déterministe).
- Un nouveau contrat `docs/contrats.md` dédié : ce rappel est un confort
  d'affichage, pas un invariant de gouvernance — pas d'ID QUA créé.

## 3. Contraintes

- Ne rien inventer si l'audit n'a jamais été généré (cas déjà géré :
  message « pas encore généré ») — le rappel de péremption ne s'applique
  que si un rapport existe déjà avec une date de scan lisible.
- Le calcul de péremption doit rester lisible dans la locale existante
  (`fr`/`en`) et ne pas casser le HTML actuel du tableau de bord ni faire
  échouer `.githooks/run-checks.mjs` (avertissement non bloquant uniquement).

## 4. Décisions

- (2026-10-04) Seuil de péremption : 30 jours depuis la date du bloc
  « Dernier scan » de chaque rapport, comparée à la date système au
  moment de la génération (pas la date du dernier commit — plus simple,
  suffisant pour un rappel).
- (2026-10-04) Portée : les deux audits concernés (opportunité **et**
  risques/dette), même mécanique pour les deux.
- (2026-10-04) Affichage : dans le tableau de bord HTML (à côté de la
  date déjà affichée) **et** en avertissement non bloquant dans
  `.githooks/run-checks.mjs` (même famille que les lignes « non
  exécuté », mais un message dédié « audit périmé »).

## 5. Points à trancher

(aucun — les 4 décisions ci-dessus couvrent le périmètre)

## 6. Lots

- **Lot 1 — rappel de péremption** [IA] : ajouter une fonction partagée
  (ou dupliquée simplement si pas de module commun entre les deux
  scripts) qui compare la date du bloc « Dernier scan » de
  `docs/decouverte-valeur.md` et `docs/audit-risques.md` à la date du
  jour, avec un seuil de 30 jours.
  - Dans `.githooks/tableau-de-bord.mjs` (`rendreAudit()`) : si périmé,
    ajouter une mention visuelle (ex. « ⚠ scan vieux de N jours, à
    relancer ») à côté de la date déjà affichée.
  - Dans `.githooks/run-checks.mjs` : si un rapport existe et est périmé,
    ajouter une ligne dans `nonExecutes` du type « audit d'opportunité
    périmé (vieux de N jours) », non bloquante (comme les lignes « non
    exécuté » actuelles).
  - Critère de sortie : test ajouté pour chaque script (cas non passant :
    rapport récent → aucun avertissement ; cas passant : rapport avec une
    date > 30 jours → avertissement affiché), tests existants toujours
    verts.

## 7. Reprise

(pas encore démarré)
