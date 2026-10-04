# Recette : modifier les rôles ou les droits

*(modèle à compléter par le projet une fois la stack choisie — où vivent les
permissions, comment le front les reflète sans en être la source de vérité)*

1. Où vivent les rôles et permissions côté serveur (source de vérité : c'est
   elle qui décide, jamais le front seul — voir `docs/contrats.md`).
2. Garder un éventuel miroir front aligné (ex. une fausse API de test) :
   sinon les tests front vérifient autre chose que la réalité.
3. Un nouveau rôle dans le fournisseur d'identité (ex. Keycloak, un realm ou
   équivalent) : l'ajouter à la configuration versionnée s'il y en a une, et
   la documenter dans `docs/securite.md` si présent.
4. Tests : la règle attendue côté serveur, les écrans visibles selon le rôle
   côté front.
5. Toute ouverture de droit vers la production se signale explicitement dans
   le message de commit.
