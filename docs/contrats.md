# Contrats (source unique des invariants)

Chaque invariant est identifié par un ID unique. Ne pas les recopier ailleurs : citer l'ID.

## SEC-001 — Portée des droits
**Règle** : Les droits d'accès sont décidés par le backend.
**Périmètre** : Toutes les routes exposées.
**Source de vérité** : Code backend (couche autorisations).
**Preuve** : Tests d'autorisation.
**Raison** : Principe de défense en profondeur.

## QUA-013 — Contrôle non exécuté n'est pas passé
**Règle** : Un contrôle qui n'a pas tourné n'est pas un contrôle passé.
**Périmètre** : Tout contrôle listé dans les vérifs.
**Source de vérité** : `.githooks/run-checks.sh` et son historique d'exécution.
**Preuve** : Sortie lue du contrôle concerné.
**Raison** : Empêcher l'affirmation sans exécution.
