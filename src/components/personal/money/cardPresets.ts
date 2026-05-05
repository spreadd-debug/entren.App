// Presets de bancos / billeteras para autocompletar nombre + colores + logo
// al crear o editar una tarjeta.
//
// Los logos están bundleados en /public/cards/<slug>.svg (los que están
// disponibles en simple-icons npm). Para los bancos AR que simple-icons no
// trae (BBVA, Santander, Galicia, Brubank, Naranja X, etc.) sólo dejamos los
// colores oficiales y el visual queda con el gradient + el nombre del banco
// como texto. Si el día de mañana querés agregar el logo de uno de esos
// bancos, copiá un SVG monochrome a public/cards/<slug>.svg y poné el path
// en logo_url acá.
//
// CreditCardVisual aplica `filter: brightness(0) invert(1)` para que el SVG
// (que viene en negro por default) se renderice blanco sobre el gradient.

export interface CardPreset {
  bank: string;       // valor que se guarda en card.bank — el match es por este string
  label: string;      // texto que ve el usuario en el picker
  color_a: string;
  color_b: string;
  logo_url: string;   // path local '/cards/<slug>.svg' o '' si no hay logo
}

export const CARD_PRESETS: CardPreset[] = [
  // ── Bancos AR (sin logo en simple-icons — sólo colores oficiales) ────────
  { bank: 'BBVA',              label: 'BBVA',              color_a: '#004481', color_b: '#1464A5', logo_url: '' },
  { bank: 'Santander',         label: 'Santander',         color_a: '#EC0000', color_b: '#9E1B32', logo_url: '' },
  { bank: 'Galicia',           label: 'Galicia',           color_a: '#F77800', color_b: '#FF9A33', logo_url: '' },
  { bank: 'Macro',             label: 'Macro',             color_a: '#0099D8', color_b: '#3FB6E5', logo_url: '' },
  { bank: 'Nación',            label: 'Banco Nación',      color_a: '#005CB9', color_b: '#1976D2', logo_url: '' },
  { bank: 'Provincia',         label: 'Banco Provincia',   color_a: '#005CB9', color_b: '#3FB6E5', logo_url: '' },
  { bank: 'Ciudad',            label: 'Banco Ciudad',      color_a: '#FFD700', color_b: '#FFA500', logo_url: '' },
  { bank: 'Patagonia',         label: 'Banco Patagonia',   color_a: '#0066CC', color_b: '#0099FF', logo_url: '' },
  { bank: 'Supervielle',       label: 'Supervielle',       color_a: '#1A237E', color_b: '#3949AB', logo_url: '' },
  { bank: 'Comafi',            label: 'Comafi',            color_a: '#E60023', color_b: '#990017', logo_url: '' },
  { bank: 'Hipotecario',       label: 'Banco Hipotecario', color_a: '#003D7C', color_b: '#1976D2', logo_url: '' },
  { bank: 'ICBC',              label: 'ICBC',              color_a: '#C7000A', color_b: '#8B0000', logo_url: '' },
  // ── Billeteras virtuales ─────────────────────────────────────────────────
  { bank: 'Mercado Pago',      label: 'Mercado Pago',      color_a: '#009EE3', color_b: '#26C6DA', logo_url: '/cards/mercadopago.svg' },
  { bank: 'Ualá',              label: 'Ualá',              color_a: '#FF8000', color_b: '#FFA94D', logo_url: '' },
  { bank: 'Brubank',           label: 'Brubank',           color_a: '#3B82F6', color_b: '#60A5FA', logo_url: '' },
  { bank: 'Naranja X',         label: 'Naranja X',         color_a: '#FF6900', color_b: '#FFA94D', logo_url: '' },
  { bank: 'Personal Pay',      label: 'Personal Pay',      color_a: '#7C3AED', color_b: '#A855F7', logo_url: '' },
  { bank: 'Nubank',            label: 'Nubank',            color_a: '#820AD1', color_b: '#A050E0', logo_url: '/cards/nubank.svg' },
  // ── Bancos globales con logo en simple-icons ─────────────────────────────
  { bank: 'HSBC',              label: 'HSBC',              color_a: '#DB0011', color_b: '#990000', logo_url: '/cards/hsbc.svg' },
  // ── Marcas de tarjeta ────────────────────────────────────────────────────
  { bank: 'Visa',              label: 'Visa',              color_a: '#1A1F71', color_b: '#3C4FBE', logo_url: '/cards/visa.svg' },
  { bank: 'Mastercard',        label: 'Mastercard',        color_a: '#EB001B', color_b: '#F79E1B', logo_url: '/cards/mastercard.svg' },
  { bank: 'American Express',  label: 'American Express',  color_a: '#2E77BB', color_b: '#5B98D4', logo_url: '/cards/americanexpress.svg' },
];

// Devuelve el preset cuyo bank coincida (case-insensitive). Null si no hay match.
export function findPresetByBank(bank: string | null | undefined): CardPreset | null {
  if (!bank) return null;
  const key = bank.trim().toLowerCase();
  return CARD_PRESETS.find(p => p.bank.toLowerCase() === key) ?? null;
}
