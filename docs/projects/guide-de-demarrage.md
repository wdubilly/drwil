# Projet : un guide de démarrage — redémarrer la session, auto-merge, protection de branche

**Statut** : cadré le 2026-10-17.
**Intention** : `docs/intentions/guide-de-demarrage.md`
**Risque** : MEDIUM
**Maturité** : prêt

<!-- scope
files:
  - README.md
  - packages/drwil/README.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/CHANGELOG.md
-->

(cadrage : la section Installation des deux README, la skill de lancement
(gabarit et copie) et son test, le changelog.)

## 1. Besoin

Retour d'expérience de `drwil_com` (2026-10-17), version réduite de
l'intention, en distinguant **prérequis**, **recommandations** et
**options** :

1. **Redémarrer la session de l'agent** après `init` ou un changement de
   hooks : constaté et confirmé par le demandeur le 2026-10-17 (session
   ouverte avant `init`, aucun hook actif). Le contrôle simple : au
   démarrage, l'agent affiche « État de gouvernance… ».
2. **Autorisation de l'auto-merge** (option) : à activer dans les
   réglages du dépôt GitHub ; sinon `gh pr merge --auto` échoue, et drwil
   doit le dire au lieu de laisser croire que la fusion est programmée.
   Distinguer : PR fusionnable, auto-merge autorisé par le dépôt,
   auto-merge programmé, fusion faite.
3. **Protection de la branche principale** (recommandation, pas un
   prérequis) : exiger les contrôles de CI ; exemple GitHub, permissions,
   limites.

## Critères d'acceptation

- La section Installation du README distingue prérequis,
  recommandations et options, et dit : redémarrer la session de l'agent
  après `init` (avec le contrôle « État de gouvernance… » et la limite :
  dépend de l'outil) ; l'autorisation de l'auto-merge dans les réglages
  du dépôt (option) ; la protection de la branche principale
  (recommandation, exemple GitHub, permissions, limites) — `QUA-040`
- La skill de lancement dit, quand `gh pr merge --auto` échoue parce que
  le dépôt ne l'autorise pas, « auto-merge non autorisé par le dépôt » et
  la marche à suivre, reste en CLOSING et ne dit jamais la fusion
  programmée ; prouvé par le test de la skill — `QUA-037`
- Le changelog (« Unreleased ») le dit — `QUA-040`

## Contrats modifiés

Aucun.

## 2. Hors périmètre

- Le dépôt git existant avant `init` (procédure à part pour un dépôt
  existant) : reste dans l'intention.
- La vérification de la protection par le kit : 0.7.0
  (`docs/intentions/forge-dans-le-livrable.md`).
- `doctor` qui lirait le réglage d'auto-merge (écarté : dépend de `gh` et
  de ses droits).

## 3. Contraintes

- Le README reste la source unique (pas de document à part).
- Ne pas présenter le redémarrage comme une garantie universelle.

## 4. Décisions

- 2026-10-17 (demandeur, sondage) : section du README ; auto-merge
  refusé dit par la skill ; protection en recommandation documentée.

## 5. Lots

- **Lot 1** : README (et README du paquet s'il en parle), skill et son
  test, changelog ; PR.

## 6. Reprise

- **Dernier état** (2026-10-17) : cadré ; rien de commencé.
