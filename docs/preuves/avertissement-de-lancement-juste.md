# Preuve de clôture — avertissement-de-lancement-juste

**Clos le** : 2026-11-17
**Commit vérifié** : `6545f36e01` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:f85c0c0b77fabe1d`, acceptés par l'humain au lancement le 2026-11-17

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| L'avertissement du lancement nomme chaque fichier de .githooks/ tel que le bloc scope le cite : un fichier de test est nommé comme test (« .githooks/state.test.mjs »), jamais renommé en son module | `QUA-137` | `tests-qua-137` | — |
| La puce proposée pour un fichier de test le nomme lui-même ; le message dit qu'un test modifié se déclare par son nom ou par celui de son module, et qu'aucune puce n'est due pour un fichier seulement mentionné dans le texte de la fiche | `QUA-137` | `tests-qua-137` | — |
| Un fichier de .githooks/ cité seulement dans le texte de la fiche (contrainte, hors périmètre, besoin), hors du bloc scope, ne déclenche aucun avertissement | `QUA-137` | `tests-qua-137` | — |
| Le message dit « le bloc scope cite » au lieu de « le cadrage cite » | `QUA-137` | `tests-qua-137` | — |
| Tests : test cité seul nommé comme test, en échec contre le code actuel ; puce au nom du test acceptée au lancement et à la clôture ; hook mentionné hors du bloc sans avertissement ; anglais | `QUA-137` | `tests-qua-137` | — |
