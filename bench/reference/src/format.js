// Affichage des prix pour la boutique (français) : « 12,50 € ».

/** Montant en centimes affiché en euros, virgule décimale, deux décimales. */
export function euros(centimes) {
  if (!Number.isInteger(centimes)) throw new TypeError("montant attendu en centimes entiers");
  const signe = centimes < 0 ? "-" : "";
  const absolu = Math.abs(centimes);
  const unites = Math.floor(absolu / 100);
  const reste = String(absolu % 100).padStart(2, "0");
  return `${signe}${unites},${reste} €`;
}
