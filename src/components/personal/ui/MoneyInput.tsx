import React from 'react';

// Input para montos. Internamente trabaja con un string de solo dígitos
// (lo que el usuario ve formateado en es-AR con separador de miles).
// El value que devuelve por onChange es el string raw (solo dígitos, opcional
// con un punto decimal). Para convertir a number: Number(value).
//
// Uso típico:
//   <MoneyInput value={form.amount} onChange={v => setForm({ ...form, amount: v })} currency="ARS" />

function formatNumberAR(raw: string): string {
  // raw puede contener dígitos y como mucho 1 punto decimal (".").
  if (!raw) return '';
  const [intPart, decPart] = raw.split('.');
  const intDigits = (intPart || '').replace(/\D/g, '');
  const formattedInt = intDigits ? Number(intDigits).toLocaleString('es-AR') : '';
  if (decPart === undefined) return formattedInt;
  // Mantener el separador decimal como coma en es-AR.
  const decDigits = decPart.replace(/\D/g, '').slice(0, 2);
  return `${formattedInt || '0'},${decDigits}`;
}

function parseInput(input: string): string {
  // Acepta dígitos, punto y coma. Coma se trata como separador decimal.
  // Un único separador decimal permitido.
  const cleaned = input.replace(/[^\d.,]/g, '');
  // Si hay coma, la usamos como decimal; los puntos se descartan (separadores de miles).
  // Importante: si el usuario acaba de tipear ',' (sin decimales aún), preservamos
  // el punto trailing — sino la coma "desaparece" en el próximo render y nunca
  // logra escribir un valor decimal como "2,47".
  if (cleaned.includes(',')) {
    const [intP, decP = ''] = cleaned.split(',');
    const intDigits = intP.replace(/\D/g, '');
    const decDigits = decP.replace(/\D/g, '').slice(0, 2);
    return `${intDigits}.${decDigits}`;
  }
  // Sin coma: si hay punto al final podría ser separador de miles o decimal.
  // Asumimos que es separador de miles → strip todos.
  return cleaned.replace(/\./g, '');
}

interface Props {
  value: string;            // valor raw (solo dígitos y opcional punto decimal)
  onChange: (v: string) => void;
  currency?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASSES: Record<NonNullable<Props['size']>, string> = {
  sm: 'text-sm py-2 px-3',
  md: 'text-base py-2.5 px-4',
  lg: 'text-2xl font-serif py-3 px-4',
  xl: 'text-5xl font-serif py-4 px-2',
};

export const MoneyInput: React.FC<Props> = ({
  value,
  onChange,
  currency,
  placeholder,
  className = '',
  inputClassName = '',
  autoFocus,
  size = 'md',
}) => {
  const display = formatNumberAR(value);

  return (
    <div className={`relative flex items-baseline ${className}`}>
      {currency && (
        <span className={`text-[var(--color-ink-muted)] mr-1 select-none ${size === 'xl' ? 'text-2xl font-serif' : size === 'lg' ? 'text-base' : 'text-xs uppercase tracking-wider'}`}>
          {currency}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={e => onChange(parseInput(e.target.value))}
        placeholder={placeholder ?? '0'}
        autoFocus={autoFocus}
        className={`flex-1 bg-transparent text-[var(--color-ink)] focus:outline-none tabular-nums ${SIZE_CLASSES[size]} ${inputClassName}`}
      />
    </div>
  );
};
