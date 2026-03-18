import { Input } from '@/components/ui/input';
import { formatCurrencyInput, currencyDisplayToNumber } from '@/lib/currency';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function CurrencyInput({ value, onChange, placeholder = '0,00', id, className, disabled }: CurrencyInputProps) {
  const displayValue = value > 0 ? formatCurrencyInput(Math.round(value * 100).toString()) : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      onChange(0);
      return;
    }
    const cents = parseInt(digits, 10);
    onChange(cents / 100);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
      <Input
        id={id}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`pl-10 ${className || ''}`}
        disabled={disabled}
      />
    </div>
  );
}
