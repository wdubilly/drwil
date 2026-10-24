# Preuve de clôture — contournements-completes

**Clos le** : 2026-10-24
**Commit vérifié** : `a1a257917c` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Sur une PR, la CI rejoue aussi les contrôles avec le code des hooks de la branche principale (sa .githooks/) et la liste de contrôles de la PR : une PR qui affaiblit un hook échoue ; un contrôle retiré de .drwil/ia-first.json fait échouer la CI, sauf s'il est déclaré dans « Contrats modifiés » de la fiche du chantier, validé par le demandeur ; prouvé par un scénario de contournement dans un vrai dépôt | `QUA-113` | `tests-qua-113` | — |
| La garde shell de Claude Code refuse à l'agent, sans demander, toute commande qui saute les hooks ou écrit, supprime ou surcharge core.hooksPath (--no-verify, commit -n, -c core.hooksPath=, git config core.hooksPath, --unset, GIT_CONFIG_*), y compris dans une commande composée ou un sh -c ; une simple lecture du réglage passe | `QUA-114` | `tests-qua-114` | — |
| bypass_actors reste non comparé en CI, limite écrite : drwil guarantees et doctor le vérifient avec le jeton de l'humain quand il est administrateur, et le disent « non vérifié » sinon | `QUA-115` | `tests-qua-115` | — |
