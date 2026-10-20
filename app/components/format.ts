// Petites fonctions d'affichage partagées entre les composants.

// 12500 -> "12 500"
export function formatNumber(value: number): string {
  return value.toLocaleString("fr-FR");
}

// 12500 -> "12 500 cr"
export function formatCredits(value: number): string {
  return `${formatNumber(value)} cr`;
}
