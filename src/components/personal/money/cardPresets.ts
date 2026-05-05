// Presets de bancos / billeteras para autocompletar nombre + colores + logo
// al crear o editar una tarjeta.
//
// Los logos vienen de simple-icons (CDN público gratis, sin API key) — devuelve
// SVGs vectoriales con el color que le pidas en hex. Si en el futuro un banco
// no está en simple-icons, se puede hostear el SVG en /public o usar otro CDN.
//
// El match en runtime (CreditCardVisual) busca el preset cuyo `bank` coincida
// con el campo bank de la tarjeta (case-insensitive). Si no hay match, no se
// renderiza logo — la tarjeta queda con el gradient solo (o la foto subida).

export interface CardPreset {
  bank: string;       // valor que se guarda en card.bank — el match es por este string
  label: string;      // texto que ve el usuario en el picker
  color_a: string;
  color_b: string;
  logo_url: string;   // URL pública de un SVG (idealmente blanco para contraste sobre el gradient)
}

// Helper: simple-icons CDN — https://simpleicons.org
// Formato: https://cdn.simpleicons.org/<slug>/<hex sin #>
const si = (slug: string, hex: string = 'ffffff') => `https://cdn.simpleicons.org/${slug}/${hex}`;

export const CARD_PRESETS: CardPreset[] = [
  // ── Bancos AR + globales en simple-icons ─────────────────────────────────
  { bank: 'BBVA',              label: 'BBVA',              color_a: '#004481', color_b: '#1464A5', logo_url: si('bbva') },
  { bank: 'Santander',         label: 'Santander',         color_a: '#EC0000', color_b: '#9E1B32', logo_url: si('santander') },
  { bank: 'HSBC',              label: 'HSBC',              color_a: '#DB0011', color_b: '#990000', logo_url: si('hsbc') },
  { bank: 'Citi',              label: 'Citi',              color_a: '#003B70', color_b: '#0066B3', logo_url: si('citi') },
  { bank: 'ICBC',              label: 'ICBC',              color_a: '#C7000A', color_b: '#8B0000', logo_url: si('icbc') },
  { bank: 'Banco do Brasil',   label: 'Banco do Brasil',   color_a: '#FFEF38', color_b: '#003D7C', logo_url: si('bancodobrasil', '003d7c') },
  // ── Billeteras virtuales ─────────────────────────────────────────────────
  { bank: 'Mercado Pago',      label: 'Mercado Pago',      color_a: '#009EE3', color_b: '#26C6DA', logo_url: si('mercadopago') },
  { bank: 'Ualá',              label: 'Ualá',              color_a: '#FF8000', color_b: '#FFA94D', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Logo_Ual%C3%A1.svg/512px-Logo_Ual%C3%A1.svg.png' },
  { bank: 'Brubank',           label: 'Brubank',           color_a: '#3B82F6', color_b: '#60A5FA', logo_url: 'https://play-lh.googleusercontent.com/lf3MQTsf0r7ueQiL-LHFzd0nO4fIbQwlKcBpQRhSzS1l-zDxHl7HcmlJNcZK1-K_IBA' },
  { bank: 'Naranja X',         label: 'Naranja X',         color_a: '#FF6900', color_b: '#FFA94D', logo_url: 'https://play-lh.googleusercontent.com/0e6V3FDvxOPpRPg99Ml-3UKUGUWnK4vfHGnNg0lt8klqqKQ-eGbn4PlKa0LaS4eHRvI' },
  { bank: 'Personal Pay',      label: 'Personal Pay',      color_a: '#7C3AED', color_b: '#A855F7', logo_url: '' },
  // ── Bancos AR sin logo en simple-icons (queda solo el gradient) ──────────
  { bank: 'Galicia',           label: 'Galicia',           color_a: '#F77800', color_b: '#FF9A33', logo_url: '' },
  { bank: 'Macro',             label: 'Macro',             color_a: '#0099D8', color_b: '#3FB6E5', logo_url: '' },
  { bank: 'Nación',            label: 'Banco Nación',      color_a: '#005CB9', color_b: '#1976D2', logo_url: '' },
  { bank: 'Provincia',         label: 'Banco Provincia',   color_a: '#005CB9', color_b: '#3FB6E5', logo_url: '' },
  { bank: 'Ciudad',            label: 'Banco Ciudad',      color_a: '#FFD700', color_b: '#FFA500', logo_url: '' },
  { bank: 'Patagonia',         label: 'Banco Patagonia',   color_a: '#0066CC', color_b: '#0099FF', logo_url: '' },
  { bank: 'Supervielle',       label: 'Supervielle',       color_a: '#1A237E', color_b: '#3949AB', logo_url: '' },
  { bank: 'Comafi',            label: 'Comafi',            color_a: '#E60023', color_b: '#990017', logo_url: '' },
  { bank: 'Hipotecario',       label: 'Banco Hipotecario', color_a: '#003D7C', color_b: '#1976D2', logo_url: '' },
  // ── Marcas de tarjeta (cuando no querés mostrar el banco sino la marca) ──
  { bank: 'Visa',              label: 'Visa',              color_a: '#1A1F71', color_b: '#3C4FBE', logo_url: si('visa') },
  { bank: 'Mastercard',        label: 'Mastercard',        color_a: '#EB001B', color_b: '#F79E1B', logo_url: si('mastercard') },
  { bank: 'American Express',  label: 'American Express',  color_a: '#2E77BB', color_b: '#5B98D4', logo_url: si('americanexpress') },
];

// Devuelve el preset cuyo bank coincida (case-insensitive). Null si no hay match.
export function findPresetByBank(bank: string | null | undefined): CardPreset | null {
  if (!bank) return null;
  const key = bank.trim().toLowerCase();
  return CARD_PRESETS.find(p => p.bank.toLowerCase() === key) ?? null;
}
