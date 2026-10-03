# Recette : refactorer sans rien casser

Méthode indépendante de la stack : tests de caractérisation d'abord, petits
pas, aucun changement de comportement.

1. **Tests de caractérisation d'abord**, sur le code actuel : ce que voit
   l'utilisateur (rôles, textes, boutons), les appels envoyés (corps
   compris), les cas d'erreur. Les commiter seuls, verts, avant de toucher
   au code.
2. Découper par petites étapes, un commit chacune, contrôles verts à chaque
   fois (`node .githooks/run-checks.mjs`) : extraire d'abord la logique pure
   (avec ses tests), puis le reste.
3. Aucun changement de comportement. Un bug trouvé en route : commit séparé
   avec son test, signalé (`AGENTS.md`, section Conduite).
4. **Pièges déjà rencontrés** *(exemples génériques JS/TS, à compléter par le
   projet au fil des refactors)* :
   - un état porté par un composant démonté se perd au changement d'écran →
     le remonter dans un composant parent ou un hook stable ;
   - une valeur utilisée avant sa déclaration (zone morte temporelle) ;
   - un import de type mélangé à un import de valeur : séparer avec
     `import type` quand le nom ne sert qu'en type.
5. Vérifier aussi la compilation de production, et si possible un passage
   manuel dans l'appli sur le chemin touché.
