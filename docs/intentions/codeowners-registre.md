# Intention : CODEOWNERS cite le registre sous son nom actuel

**Statut** : proposée le 2026-10-22 — écart relevé pendant l'inventaire des
contournements ;
cadrée le 2026-10-23 dans `docs/projects/codeowners-registre.md` (la question est tranchée).

## Besoin

`.github/CODEOWNERS` protège /docs/contrats.md, l'ancien nom français du
registre. Le registre s'appelle aujourd'hui `docs/contracts.md` : un
changement des contrats, c'est-à-dire des règles, n'exige donc pas la
relecture du propriétaire, alors que le ruleset l'impose
(`require_code_owner_review`) pour les autres zones sensibles.

## Existant (relevé le 2026-10-22)

- `.github/CODEOWNERS` couvre `/.githooks/`, `/.claude/`,
  `/.drwil/ia-first.json`, `/.github/`, /docs/contrats.md et
  `/packages/drwil/templates/common/`.
- Ajouté par le chantier « protéger master » (journal du 2026-10-13), avant
  le passage du cœur à l'anglais.

## Questions à trancher

- [décision] Corriger le chemin, et ajouter un contrôle qui refuse une ligne
  de CODEOWNERS citant un chemin absent ? Ce changement touche les règles du
  jeu : il attend le oui du demandeur.
