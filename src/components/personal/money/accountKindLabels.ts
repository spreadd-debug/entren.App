import { AccountKind } from '../../../../shared/types';

// Labels más claros que evitan la confusión entre "efectivo" y "billetera":
// - cash:       billetes físicos en la mano (la "billetera de cuero")
// - bank:       cuenta de banco (caja de ahorro / cuenta corriente)
// - wallet:     billetera VIRTUAL (Mercado Pago, Ualá, Brubank, Naranja X, ...)
// - investment: inversiones (broker, plazo fijo, cripto, fondos)
// - other:      cualquier otra cosa
export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  cash:       'Efectivo',
  bank:       'Banco',
  wallet:     'Virtual',
  investment: 'Inversión',
  other:      'Otra',
};

// Versión expandida para descripciones / tooltips.
export const ACCOUNT_KIND_DESCRIPTIONS: Record<AccountKind, string> = {
  cash:       'Billetes físicos en mano',
  bank:       'Cuenta bancaria',
  wallet:     'Billetera virtual (MP, Ualá, ...)',
  investment: 'Inversiones',
  other:      'Otra',
};
