# Intention : un gain fait pour le dépôt est pesé pour le livrable (angle mort de QUA-018)

**Statut** : proposée le 2026-11-19 par le demandeur, rangée en 0.11.3.

## Besoin

QUA-018 (périmètre explicite : dépôt drwil ou livrable gabarit) fait demander la casquette visée quand une demande est
ambiguë, et son contrôle `miroirs-gabarit` refuse ce qui fuit du dépôt vers le gabarit. Rien ne regarde l'autre sens :
un gain obtenu pour le dépôt (outil de `outils/`, fichier `propresAuDepot` de `outils/miroirs.json`) dont le livrable
aurait besoin reste au dépôt sans que la question soit posée. Le principe « livrable léger, dépôt éprouvé » y pousse
même : il range les outils coûteux côté dépôt. Constaté le 2026-11-19 : le lancement unique des tests par passe
(QUA-033, `outils/tests-par-fichier.mjs`, 2026-10-16) n'a jamais été livré ; chez `marinade-poulet`, 27 démarrages de
Vitest font passer la CI de 12 à 22 minutes (fiche `docs/projects/controles-contrats-groupes.md`, 0.11.2).

Le demandeur veut que la cible principale reste le livrable : chaque chantier qui améliore le dépôt dit si le livrable
en a besoin.

## Existant

Relevé le 2026-11-19 (journal et `outils/miroirs.json`), gains du dépôt non reportés au livrable :

- Lancement unique des tests de contrats par passe (QUA-033) — fiche cadrée, 0.11.2.
- Inventaire des `**Couvre**` trop larges, qui font tomber une attestation sans rapport (QUA-299,
  `outils/inventaire-attestations.mjs`, 2026-11-14) — rien chez l'adoptant.
- Audit des dépendances (SEC-006, `outils/audit-dependances.mjs`, 2026-10-11) — chaque adoptant écrit le sien.
- Fichiers de CI en YAML valide avant le push (QUA-046, `.github/scripts/workflows-yaml.test.mjs`, 2026-10-18) — un
  fichier invalide n'est vu qu'à la forge.
- Analyse statique (CodeQL, `.github/workflows/codeql.yml`) — aucune livrée.
- Protection de la forge (CODEOWNERS, ruleset, QUA-112) — déjà suivie : `docs/intentions/forge-dans-le-livrable.md`.
- Mesure du temps de CI — déjà suivie : `docs/projects/temps-des-controles-journalise.md` (0.11.3).
- Matrice multi-OS de la CI (QUA-045) — choix assumé, utile aux seuls paquets multiplateformes.

Restent propres au dépôt à juste titre : banc des agents et mini-banc, `installer-depot`, `verifier-miroirs`,
`tester-tarball`, `verifier-await-premier-niveau` (hooks du kit seulement). Déjà livrés : reprise des verdicts en CI
(QUA-250), verdicts contrôle par contrôle (QUA-141), contrôles en parallèle, tranches (`shards`).

## Questions à trancher

- [décision] Le critère ajouté à QUA-018 (contrat existant modifié) : toute clôture qui crée ou modifie un fichier
  propre au dépôt dit, dans son entrée de journal, si le livrable en a besoin (intention ouverte) ou pourquoi non ;
  vérifié par la clôture, ou seulement rappelé ?
- [décision] Pour chaque gain non reporté ci-dessus : fiche, intention à part, ou refus motivé.
