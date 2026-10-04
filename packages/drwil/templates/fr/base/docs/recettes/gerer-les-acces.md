# Recette : gérer les accès

*(modèle à compléter par le projet si un fournisseur d'identité externe est
utilisé, ex. Keycloak, Auth0… — sinon cette recette ne s'applique pas et peut
être supprimée)*

Modèle d'authentification et rôles : `docs/securite.md`, section « Authentification et rôles » (si présente). Modifier un rôle ou une
permission : `docs/recettes/modifier-les-droits.md`.

## Opérations courantes

- **Donner un accès** : ajouter la personne au groupe ou rôle voulu.
- **Première connexion / mot de passe oublié** : procédure du fournisseur
  d'identité.
- Un changement de rôle, une désactivation de compte ou une session fermée
  doit prendre effet sans attendre que la personne se reconnecte, ou au pire
  dans un délai annoncé.
- **Comptes de test** sur un poste de dev : jamais en production.
- **Historique des connexions et des actions d'administration** : à
  conserver et consulter sans qu'il recopie les secrets (mots de passe,
  TOTP) dans les journaux.
