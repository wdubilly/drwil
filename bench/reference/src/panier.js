// Panier de la boutique. Les montants sont en centimes (entiers) : jamais d'euros en virgule flottante.

/** Total du panier, en centimes. Une ligne : { article, prixCentimes, quantite }. */
export function total(lignes) {
  return lignes.reduce((somme, ligne) => somme + ligne.prixCentimes, 0);
}

/** Montant après une remise en pourcentage (0 à 100), arrondi au centime. */
export function appliquerRemise(montantCentimes, pourcent) {
  if (!Number.isFinite(pourcent) || pourcent < 0 || pourcent > 100) throw new RangeError("remise hors de 0 à 100 %");
  return Math.round((montantCentimes * (100 - pourcent)) / 100);
}

/** Nombre d'articles du panier (somme des quantités). */
export function nombreArticles(lignes) {
  return lignes.reduce((somme, ligne) => somme + ligne.quantite, 0);
}
