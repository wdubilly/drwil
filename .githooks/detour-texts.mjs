// Messages and brief template of the detour, French and English (split from detour.mjs).
import { BRIEF_DIRS } from "./briefs.mjs";

export const JOURNAL = `${BRIEF_DIRS[0]}journal.md`;

export const TEXTS = {
  fr: {
    usage: "usage : node .githooks/detour.mjs open <nom> --title <défaut> [--files <a,b>] | resume | allow",
    notBuild: "détour refusé : activité {0} — un détour s'ouvre en BUILD, en plein chantier",
    already: "détour refusé : un détour est déjà en cours ({0}) — le reprendre d'abord",
    name: "détour refusé : nom attendu en minuscules, chiffres et tirets (ex. : date-mal-lue), et --title <défaut>",
    noBranch: "détour refusé : il faut une branche de chantier et une branche principale (main ou master)",
    exists: "détour refusé : {0} ou {1} existe déjà — choisir un autre nom",
    stashFailed: "détour refusé : le travail en cours ne peut pas être mis de côté (conflit non résolu ?) — rien n'a changé",
    switchFailed: "détour refusé : création de la branche impossible ({0}) — rien n'a changé",
    opened: "détour ouvert : branche {0} depuis {1}, fiche {2}{3}.",
    stashed: ", travail en cours mis de côté (stash {0})",
    steps: [
      "Suite, dans l'ordre :",
      "  1. Cadrer la fiche {2} (bloc scope : la correction et son test, rien d'autre) et la commiter seule.",
      "  2. Test d'abord, vu échouer ; puis la correction (recette « corriger un défaut ») ; `node .githooks/run-checks.mjs`.",
      `  3. Entrée de journal (${JOURNAL}) « Détour de {0} : … » citant la branche {1}, puis suppression de la fiche ; commit.`,
      "  4. Push, PR intitulée « Détour de {0} : … », {3}.",
      "  5. PR fusionnée : `node .githooks/detour.mjs resume`.",
    ].join("\n"),
    auto: "fusion automatique programmée (`gh pr merge --auto --merge`)",
    manual: "fusion laissée à l'humain",
    rulesAhead: "⚠ ces fichiers changent les règles du jeu : le oui de l'humain sera demandé (`allow`) — {0}",
    noDetour: "aucun détour en cours",
    dirty: "reprise refusée : arbre modifié — commiter ou retirer d'abord (rien n'a été touché)",
    notMerged: "reprise refusée : {0} n'est pas encore fusionnée dans {1} — attendre la fusion de sa PR",
    briefLeft: "reprise refusée : la fiche {0} est encore dans {1} — la PR du détour la supprime",
    noJournal: `reprise refusée : aucune entrée de ${JOURNAL} ne cite {0} dans {1} — la PR du détour l'ajoute`,
    switchBack: "reprise refusée : retour sur {0} impossible — état inchangé, travail mis de côté intact",
    rebase:
      "reprise refusée : {0} ne se rebase pas sur {1} sans conflit (rebase annulé) — état inchangé, travail mis de côté intact ; un humain tranche",
    stashMissing: "reprise refusée : la mise de côté {0} est introuvable dans `git stash list` — état inchangé",
    restore:
      "reprise refusée : la restauration du travail entre en conflit — arbre remis propre, mise de côté {0} intacte, état inchangé ; un humain tranche",
    resumed: "détour clos : retour sur {1}, rebasée sur {2}, travail restauré ; BUILD sur {0}.",
    forcePush: "La branche était déjà poussée : `git push --force-with-lease`.",
    human: "le oui de l'humain se donne dans un terminal interactif (`node .githooks/detour.mjs allow`) ; en file, le sous-agent s'arrête",
    confirm: "Le détour {0} change les règles du jeu. L'autoriser ? Retapez DETOUR : ",
    refused: "oui non donné : rien n'a changé",
    allowed: "détour {0} autorisé à changer les règles du jeu",
    reopenConfirm: "Le correctif de la réouverture de {0} change les règles du jeu. L'autoriser ? Retapez DETOUR : ",
    reopenAllowed: "réouverture de {0} autorisée à changer les règles du jeu",
    // {0} title, {1} workstream brief, {2} branch, {3} date, {4} risk, {5} scope lines.
    brief: `# Détour : {0} (détour de {1})

**Statut** : ouvert le {3} (détour de {1}, branche {2}).
**Risque** : {4}
**Maturité** : en cours

<!-- scope
files:
{5}
-->

(cadrage : la correction et son test, rien d'autre ; le cadrage de {1} ne s'élargit jamais pour un détour.)

## 1. Besoin

{0} : défaut préalable rencontré pendant {1}, hors de son cadrage.

## Critères d'acceptation

- {0} : corrigé, gardé par un test de non-régression vu échouer avant la correction

## 4. Décisions

- Un détour s'ouvre sans demander : le contrôle est à la fusion de sa PR. Contrats concernés : QUA-017 (pas de travail direct sur la branche principale), QUA-019 (pas de contournement).

## 7. Reprise

- PR intitulée « Détour de {1} : {0} » ; avant le push, entrée de journal citant la branche {2} et suppression de cette fiche ; PR fusionnée : \`node .githooks/detour.mjs resume\`.
`,
  },
  en: {
    usage: "usage: node .githooks/detour.mjs open <name> --title <defect> [--files <a,b>] | resume | allow",
    notBuild: "detour refused: activity {0} — a detour opens in BUILD, mid-workstream",
    already: "detour refused: a detour is already in progress ({0}) — resume it first",
    name: "detour refused: name expected in lowercase, digits and dashes (e.g. date-misread), and --title <defect>",
    noBranch: "detour refused: it takes a workstream branch and a main branch (main or master)",
    exists: "detour refused: {0} or {1} already exists — pick another name",
    stashFailed: "detour refused: the work in progress cannot be set aside (unresolved conflict?) — nothing changed",
    switchFailed: "detour refused: the branch cannot be created ({0}) — nothing changed",
    opened: "detour opened: branch {0} from {1}, brief {2}{3}.",
    stashed: ", work in progress set aside (stash {0})",
    steps: [
      "Next, in order:",
      "  1. Scope the brief {2} (scope block: the fix and its test, nothing else) and commit it alone.",
      "  2. Test first, seen failing; then the fix (« fix a defect » recipe); `node .githooks/run-checks.mjs`.",
      `  3. Journal entry (${JOURNAL}) « Detour of {0}: … » citing branch {1}, then delete the brief; commit.`,
      "  4. Push, PR titled « Detour of {0}: … », {3}.",
      "  5. PR merged: `node .githooks/detour.mjs resume`.",
    ].join("\n"),
    auto: "automatic merge scheduled (`gh pr merge --auto --merge`)",
    manual: "merge left to the human",
    rulesAhead: "⚠ these files change the rules: the human's yes will be asked (`allow`) — {0}",
    noDetour: "no detour in progress",
    dirty: "resume refused: worktree modified — commit or remove first (nothing was touched)",
    notMerged: "resume refused: {0} is not merged into {1} yet — wait for its PR to be merged",
    briefLeft: "resume refused: brief {0} is still in {1} — the detour's PR deletes it",
    noJournal: `resume refused: no entry of ${JOURNAL} cites {0} in {1} — the detour's PR adds it`,
    switchBack: "resume refused: cannot go back to {0} — state unchanged, set-aside work intact",
    rebase:
      "resume refused: {0} does not rebase on {1} without conflict (rebase aborted) — state unchanged, set-aside work intact; a human decides",
    stashMissing: "resume refused: the set-aside work {0} is not in `git stash list` — state unchanged",
    restore: "resume refused: restoring the work conflicts — worktree cleaned, set-aside work {0} intact, state unchanged; a human decides",
    resumed: "detour closed: back on {1}, rebased on {2}, work restored; BUILD on {0}.",
    forcePush: "The branch was already pushed: `git push --force-with-lease`.",
    human: "the human's yes is given in an interactive terminal (`node .githooks/detour.mjs allow`); in a queue, the subagent stops",
    confirm: "Detour {0} changes the rules. Allow it? Type DETOUR: ",
    refused: "yes not given: nothing changed",
    allowed: "detour {0} allowed to change the rules",
    reopenConfirm: "The fix of the reopening of {0} changes the rules. Allow it? Type DETOUR: ",
    reopenAllowed: "reopening of {0} allowed to change the rules",
    brief: `# Detour: {0} (detour of {1})

**Status**: opened on {3} (detour of {1}, branch {2}).
**Risk**: {4}
**Maturity**: in progress

<!-- scope
files:
{5}
-->

(scope: the fix and its test, nothing else; the scope of {1} never widens for a detour.)

## 1. Need

{0}: prior defect met during {1}, outside its scope.

## Acceptance criteria

- {0}: fixed, kept by a non-regression test seen failing before the fix

## 4. Decisions

- A detour opens without asking: the check is at its PR's merge. Related contracts: QUA-017 (no direct work on the main branch), QUA-019 (no bypassing a check).

## 7. Hand-off

- PR titled « Detour of {1}: {0} »; before the push, a journal entry citing branch {2} and this brief deleted; PR merged: \`node .githooks/detour.mjs resume\`.
`,
  },
};
