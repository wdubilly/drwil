# Recette : sauvegarder et restaurer la production

*(modèle à compléter par le projet — quoi sauvegarder, scripts réels,
calendrier)*

Contexte et pièges du serveur : `docs/deploiement.md` si présent.

## Ce qui est sauvegardé

| Quoi | Où | Contenu | Format |
|---|---|---|---|
*(une ligne par donnée à sauvegarder : base de données, fichiers, configuration…)*

Toute sauvegarde doit être **vérifiée** avant d'être gardée (une copie
illisible ne sert à rien) et protégée en accès si elle contient des secrets
ou des données personnelles.

**Volontairement non sauvegardé** *(à lister : secrets qui ne doivent jamais
être dans une sauvegarde automatique — SEC-007 — et tout ce qui se
régénère seul au démarrage)*.

## Installer la sauvegarde automatique (une fois)

*(à décrire : planification, emplacement, durée de conservation, où se
trouve une copie hors serveur)*

## Restaurer

*(procédure pas à pas ; préciser que rien n'est détruit par la restauration
tant que l'ancien état n'a pas été vérifié bon à jeter)*

## Vérifier que la restauration marche (exercice)

*(un exercice de restauration périodique, sur une stack jetable, est la
seule preuve qu'une sauvegarde sert réellement à quelque chose)*
