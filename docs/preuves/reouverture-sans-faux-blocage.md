# Preuve de clôture — reouverture-sans-faux-blocage

**Clos le** : 2026-11-09
**Commit vérifié** : `d2a9a512f9` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:8f2afbafbf8e3bd8`, acceptés par l'humain au lancement le 2026-11-09

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| La réouverture restaure, dans le même commit que la fiche, chaque fichier que la fiche cite et que la branche a supprimé (l'intention d'origine en tête), et le dit ; un fichier cité supprimé ailleurs que sur la branche n'est pas restauré | `QUA-116` | `tests-qua-116` | — |
| Un fichier de test (*.test.mjs) ajouté ou modifié n'est plus un changement de règle, sauf s'il retire un test( dont le nom porte l'ID d'un contrat, ou s'il diminue le nombre d'appels assert d'un tel test : là, le oui de l'humain reste exigé, au détour comme à la réouverture, et le refus nomme le test | `QUA-117` | `tests-qua-117` | — |
