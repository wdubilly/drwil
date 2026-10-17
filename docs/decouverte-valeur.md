# Découverte de valeur et opportunités produit

> Dernier scan : 2026-10-17 (le précédent, du 2026-10-05, est remplacé :
> ses quatre opportunités sont traitées ou reprises par des intentions).
> État du projet : paquet `drwil` 0.6.1 publié en release GitHub
> (tarball), en pilote sur un premier projet neuf (`drwil_com`). Deux
> fiches prêtes : « premier essai propre » (0.6.2) et « sondage de
> lancement dans tous les cas ». Six intentions nées du pilote le même
> jour. Objet de ce scan : préparer la roadmap de la 0.6.3, puis de la
> 0.7.0. Commité plus tard (chantier « documents de cadrage sous la
> barrière ») : les chemins des fiches et intentions réalisées depuis sont
> remplacés par un renvoi au journal du 2026-10-17 ; la roadmap suivie
> vit dans `docs/projects/pending.md` (« Ordre de réalisation »).

## Aperçu de consommation

`.drwil/usage.jsonl` : 7 entrées, dont 4 depuis le dernier scan (mesure
automatique depuis le 2026-10-16, modèle `claude-opus-5-5`) : 3 253 189
tokens pour 4 chantiers (consommation livrée 1,42 M, release 0.6.0
0,94 M, projet neuf après `npm install` 0,77 M, entretien courant
0,12 M). Les quelque 65 clôtures du 2026-10-05 au 2026-10-15 précèdent la
mesure : non chiffrées.

## Opportunités prioritaires (matrice valeur / effort)

Lecture pour la roadmap : 🟢 effort faible, 🟡 moyen, 🔴 élevé ; « format »
= change un format, une sortie ou le verdict (version mineure, pas un
correctif).

| ID | Fonctionnalité proposée | Pourquoi (valeur) | État du code existant | Effort | Action recommandée |
|---|---|---|---|---|---|
| OPT-1 | Une mise à jour rafraîchit la prose que le projet n'a pas touchée (skills, recettes) | Sans elle, **aucun correctif de skill n'atteint un projet installé** : `init` ne rafraîchit que `.githooks/` et `.claude/hooks/` (`KIT_MECHANICS`, `packages/drwil/src/config.ts`). Le correctif du sondage modifie la skill `/drwil-start` : `drwil_com` ne le recevrait pas en passant en 0.6.3, sauf `--force` qui écrase aussi ce qu'il a modifié. | Manifeste avec empreintes déjà écrit à l'installation (`packages/drwil/src/manifest.ts`) ; règle « rafraîchir si inchangé » déjà appliquée aux hooks (`packages/drwil/src/install.ts`, `shouldOverwrite`). Intention « une mise à jour rafraîchit aussi la prose » (réalisée, journal du 2026-10-17). | 🟡 Moyen | **0.6.3, en premier** : condition pour que les autres correctifs servent au pilote. |
| OPT-2 | Le sondage de lancement marche dans tous les cas (un seul brief, hook jamais muet) | Bloquant constaté le 2026-10-17 : un projet neuf n'a qu'un brief, le sondage ne s'ouvre pas ; repli en terminal seulement. | Fiche prête « le sondage de lancement marche dans tous les cas » (réalisée, journal du 2026-10-17). | 🟢 Faible | **0.6.2**, avec la fiche « premier essai propre » : tout projet installé en 0.6.2 a la bonne skill ; un projet déjà installé la reçoit avec OPT-1. |
| OPT-3 | Les hooks lisent la racine du projet, pas le dossier courant | Rappel d'état faux après un `cd` (constaté le 2026-10-16) ; un lancement par sondage peut chercher `.githooks/state.mjs` au mauvais endroit. | `.claude/settings.json` passe déjà `${CLAUDE_PROJECT_DIR}` pour trouver les hooks : la variable est disponible ; `.claude/hooks/prompt-hook.mjs` et `.githooks/state.mjs` prennent `process.cwd()`. Intention « les hooks lisent la racine du projet » (réalisée, journal du 2026-10-17). | 🟢 Faible | **0.6.3**, juste après OPT-2 (mêmes fichiers). |
| OPT-4 | Un dossier passé par `npm init -y` reste un projet neuf | Réflexe courant d'un utilisateur Node ; même défaut que la 0.6.1 (projet neuf pris pour existant). | `detectDir` (`packages/drwil/src/stack.ts`), test du parcours déjà écrit pour la 0.6.1. Intention « un dossier passé par `npm init -y` reste un projet neuf » (réalisée, journal du 2026-10-17). | 🟢 Faible | **0.6.3**. |
| OPT-5 | Guide de démarrage, version réduite : redémarrer la session après `init` et vérifier les hooks, autorisation de l'auto-merge | Constaté le 2026-10-17 et confirmé par le demandeur : une session ouverte avant `init` n'a aucun hook actif ; rien n'en parle dans la doc. | Section « Installation » du `README.md` ; skill `/drwil-start` vérifie déjà la fusion programmée. Intention `docs/intentions/guide-de-demarrage.md`. | 🟢 Faible | **0.6.3**, après la 0.6.2 (même section du README). Dépôt existant et protection de branche : plus tard. |
| OPT-10 | Un identifiant sans libellé est rattrapé avant d'arriver à l'humain | Constaté par le demandeur le 2026-10-17 : les réponses de l'agent citent des ID nus (« OPT-6 à OPT-8 », « scénario S6 ») ; le rappel actuel ne relit que ce que l'agent lit, et fait trop de bruit pour être lu. | `.githooks/glossary.mjs` (source unique des libellés), `.claude/hooks/id-glossary.mjs` (rappel après chaque outil) ; pas de hook de fin de réponse. Intention `docs/intentions/identifiant-rattrape-avant-l-humain.md`. | 🟡 Moyen | **0.6.3, en tête** avec OPT-1 (demande du demandeur : rapidement). |
| OPT-6 | Une attestation tombe quand ce qu'elle couvre change | Confiance dans le verdict : aujourd'hui un PASS peut reposer sur une attestation d'un état révolu (scénario S6 du pilote). | Empreintes d'attestation déjà en place (`packages/drwil/src/verify.ts`), mais liées au texte du contrat et à la définition des contrôles ; `**Scope**` est de la prose. Intention `docs/intentions/attestation-liee-a-son-objet.md`. | 🔴 Élevé, format | **0.7.0**, priorité 1 ; mécanisme à trancher dans la fiche technique. |
| OPT-7 | Des critères et des preuves qui survivent à la clôture | Traçabilité après le chantier et rejeu en CI : aujourd'hui seuls les contrats durent. | `activeBrief` (`packages/drwil/src/criteria.ts`) ; trailer `Drwil-Brief` déjà écrit sur les commits ; `packages/drwil/src/evidence.ts`. Intention `docs/intentions/criteres-et-preuves-durables.md`. | 🔴 Élevé, format | **0.7.0**, priorité 2. |
| OPT-8 | Vérifier la barrière de fusion (absente, mal configurée, conforme, non vérifié) | Sans protection, une fusion automatique passe avant la CI (PR #1 du pilote). | `drwil doctor` (`packages/drwil/src/doctor.ts`) ; vérification de ruleset propre à ce dépôt (`.github/scripts/verifier-ruleset.mjs`). Intention `docs/intentions/forge-dans-le-livrable.md`. | 🟡 Moyen | **0.7.0**, priorité 3 (nouveau diagnostic, pas un correctif). |
| OPT-9 | Publier `drwil` sur npm | Rendrait l'URL de release et le tarball inutiles : `npx drwil init` direct. | Paquet empaquetable et éprouvé en CI (contrôle `tarball`) ; décision produit en vague 7 (`docs/intentions/packager-kit-ia-first.md`). | 🟢 Faible technique, décision | Hors 0.6.x : décision du demandeur. |

Écartés de la roadmap utilisateur (valeur pour un utilisateur du pilote
faible aujourd'hui) : date réécrite à l'installation du dépôt et `doctor`
sur le dépôt drwil (propres à ce dépôt) ; préfixe du catalogue ; file,
glossaire et consommation pour les autres agents (le pilote utilise Claude
Code) ; couverture du diff (projets existants, pas le pilote).

## Analyse détaillée des meilleures pistes

### OPT-1 — Une mise à jour rafraîchit la prose non modifiée
- **Problème résolu** : un projet qui passe d'une 0.6.x à la suivante a
  des hooks à jour mais des skills et recettes d'origine — état mélangé,
  constaté de 0.5.1 à 0.6.0.
- **Briques existantes réutilisables** : `packages/drwil/src/manifest.ts`
  (empreinte de chaque fichier installé), `packages/drwil/src/install.ts`
  (`shouldOverwrite` : mécanique inchangée réécrite), `packages/drwil/src/config.ts`
  (`KIT_MECHANICS`).
- **Ce qu'il reste à faire** : trancher les questions de l'intention
  (toute prose inchangée, ou seulement skills et recettes ; signaler la
  prose modifiée), puis étendre la règle et ses tests.
- **Impact si implémenté** : chaque correctif de la 0.6.x atteint le
  pilote par un simple `init`, sans `--force`.

### OPT-2 et OPT-3 — Sondage fiable, hooks à la bonne racine
- **Problème résolu** : le seul geste de lancement dans le chat échoue
  sur un projet neuf, sans rien dire.
- **Briques existantes réutilisables** : `.claude/hooks/prompt-hook.mjs`,
  `.githooks/state.mjs` (`start`), test du sondage dans
  `packages/drwil/test/kit.test.mjs` ; `${CLAUDE_PROJECT_DIR}` déjà
  utilisé dans `.claude/settings.json`.
- **Ce qu'il reste à faire** : OPT-2 est cadrée ; OPT-3 demande deux
  décisions (source de la racine, autres hooks).
- **Impact si implémenté** : `/drwil-start` marche du premier coup, et un
  échec dit toujours pourquoi.

### OPT-6 — Attestation liée à son objet (0.7.0)
- **Problème résolu** : un PASS ne peut plus reposer sur un jugement
  humain périmé.
- **Briques existantes réutilisables** : `packages/drwil/src/verify.ts`
  (attestation version 2, empreintes par contrôle) ;
  `packages/drwil/src/attest.ts`.
- **Ce qu'il reste à faire** : la fiche technique (règle de validité,
  correspondance attestation–contrat–preuve–objet, fichiers supprimés,
  renommés, ajoutés), principe validé le 2026-10-17.
- **Impact si implémenté** : la promesse « DRWIL demands the proof » tient
  aussi pour les preuves humaines.

## Roadmap qui en découle (proposée, à valider)

Revue le même jour : le pilote est bloqué maintenant sur `/drwil-start`,
et le goulot est le temps d'arbitrage du demandeur, pas le code.

- **0.6.2** — débloquer le pilote : « premier essai propre » et OPT-2
  (sondage de lancement dans tous les cas), deux fiches prêtes, lançables
  en file (faites, journal du 2026-10-17).
- **0.6.3** — des mises à jour qui servent, et des réponses lisibles :
  en tête OPT-10 (identifiant sans libellé rattrapé) et OPT-1 (mise à
  jour de la prose non modifiée), puis OPT-3 (racine des hooks), OPT-4
  (`npm init -y`), OPT-5 (guide de démarrage réduit).
- **Pendant la 0.6.3** : trancher les questions d'OPT-6 (attestation liée
  à son objet), pour que sa fiche technique soit prête à la sortie de la
  0.6.3.
- **0.7.0** — « la preuve qui dure » : OPT-6 (attestation liée à son
  objet), OPT-7 (critères et preuves durables), OPT-8 (barrière de fusion
  vérifiée).

Limite : valeur et effort sont des estimations de l'agent, tirées du code
et d'un seul pilote.

## Prochaine étape

Choisir les ID et répondre : « Valide OPT-X pour la convertir en
intention » — ici toutes ont déjà une intention ou une fiche : valider
la roadmap, puis cadrer les fiches de la 0.6.3.
