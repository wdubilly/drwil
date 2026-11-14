import { projectLang } from "./i18n.js";

// Messages of the commands, in the language of the project of the current folder (English outside a project).
export const TEXTS = {
  fr: {
    initDone: "Gouvernance IA-first installée dans",
    nothingToRemove: "Rien à supprimer.",
    removed: "Fichiers supprimés :",
    wouldRemove: "Fichiers qui seraient supprimés (--yes pour confirmer) :",
    modified: "Modifiés depuis l'installation, non supprimés :",
    cleaned: "Ajouts drwil retirés de ces fichiers du projet :",
    wouldClean: "Ajouts drwil qui seraient retirés de ces fichiers du projet :",
    toolsRequired: "choix des outils IA requis : relancer avec --tools <liste> parmi {0}, ou dans un terminal interactif",
    toolsQuestion: "Quels outils IA configurer ? ({0}) Liste séparée par des virgules, ou « all » : ",
    ciQuestion:
      "{0} n'a pas de zone du projet : la mise à jour du kit le remplacerait par celui du kit (zone du projet vide) et supprimerait {1}.\n{2}\nRemplacer ? La branche de mise à jour garde l'ancienne version. [o/N] ",
    driftQuestion:
      "{0} a été modifié à la main depuis l'installation ; la mise à jour du kit le remplacerait par le sien.\n{1}\nRemplacer ? La branche de mise à jour garde l'ancienne version. [o/N] ",
    serveQuestion:
      "Démarrer drwil serve à chaque session (vue en lecture seule sur 127.0.0.1, publiée aussi sur votre réseau privé si Tailscale est présent) ? [o/N] ",
    evidence: "évidence : {0}",
    manual: "  [manuel]",
    noTerminal: "attestation refusée : un terminal interactif est requis (un agent ou un script ne peut pas attester {0})",
    retype: "Pour attester, retapez l'identifiant du contrat ({0}) : ",
    attested: "{0} : {1} (à commiter avec le travail attesté)",
    noState: "{0} introuvable : lancer « drwil init » pour installer le lecteur d'état",
    adopt: {
      done: "Contrat {0} adopté : écrit dans {1} (registre du projet), retiré de {2}. À commiter avec le travail en cours.",
      noId: "identifiant de contrat attendu (ex. QUA-005)",
      notFound: "{0} absent du catalogue {1} : rien écrit",
      defined: "{0} est déjà défini dans {1} : rien écrit",
      noCheck: "{0} : le catalogue ne propose aucun contrôle pour cette pile : rien écrit (écrire le contrat à la main)",
      invalidRegistry: "registre {0} invalide : rien écrit ({1})",
      noCatalog: "catalogue {0} introuvable : rien écrit",
      added:
        "Contrat {0} ajouté : squelette écrit dans {1} (registre du projet), à compléter (règle, périmètre, preuve) puis à commiter avec le travail en cours.",
      todo: "À compléter",
      activity: "écriture du registre refusée en {0} : seul le SCOPING ou le BUILD accepte une écriture du registre (rien écrit)",
      outside: "écriture refusée : {0} hors du cadrage de la fiche active {1} (rien écrit) ; élargir le cadrage par un commit séparé",
    },
  },
  en: {
    initDone: "IA-first scaffolding applied to",
    nothingToRemove: "Nothing to remove.",
    removed: "Files removed:",
    wouldRemove: "Files that would be removed (--yes to confirm):",
    modified: "Modified since installation, not removed:",
    cleaned: "drwil additions removed from these project files:",
    wouldClean: "drwil additions that would be removed from these project files:",
    toolsRequired: "AI tools choice required: rerun with --tools <list> among {0}, or in an interactive terminal",
    toolsQuestion: 'Which AI tools to configure? ({0}) Comma-separated list, or "all": ',
    ciQuestion:
      "{0} has no project zone: the kit update would replace it with the kit's (empty project zone) and remove {1}.\n{2}\nReplace it? The update branch keeps the old version. [y/N] ",
    driftQuestion:
      "{0} was modified by hand since the installation; the kit update would replace it with the kit's.\n{1}\nReplace it? The update branch keeps the old version. [y/N] ",
    serveQuestion:
      "Start drwil serve at each session (read-only view on 127.0.0.1, also published on your private network when Tailscale is present)? [y/N] ",
    evidence: "evidence: {0}",
    manual: "  [manual]",
    noTerminal: "attestation refused: an interactive terminal is required (an agent or a script cannot attest {0})",
    retype: "To attest, type the contract's identifier again ({0}): ",
    attested: "{0}: {1} (to commit with the attested work)",
    noState: '{0} not found: run "drwil init" to install the state reader',
    adopt: {
      done: "Contract {0} adopted: written to {1} (the project's registry), removed from {2}. To commit with the work in progress.",
      noId: "a contract identifier is expected (e.g. QUA-005)",
      notFound: "{0} is not in the catalog {1}: nothing written",
      defined: "{0} is already defined in {1}: nothing written",
      noCheck: "{0}: the catalog offers no check for this stack: nothing written (write the contract by hand)",
      invalidRegistry: "registry {0} is invalid: nothing written ({1})",
      noCatalog: "catalog {0} not found: nothing written",
      added:
        "Contract {0} added: skeleton written to {1} (the project's registry), to complete (rule, scope, proof) then to commit with the work in progress.",
      todo: "To complete",
      activity: "registry write refused in {0}: only SCOPING or BUILD accepts a registry write (nothing written)",
      outside: "write refused: {0} is outside the scope of the active brief {1} (nothing written); widen the scope in a separate commit",
    },
  },
};
export const texts = () => TEXTS[projectLang(process.cwd())];
