import { Input } from '@/components/ui/input';
import { formatCurrencyInput } from '@/lib/currency';
import { useAuth } from '@/contexts/AuthContext';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  /** campo em R$ que não é financeiro (ex.: renda informada na triagem): liberado para todos */
  allowAnyone?: boolean;
}

export function CurrencyInput({ value, onChange, onBlur, placeholder = '0,00', id, className, disabled, allowAnyone }: CurrencyInputProps) {
  const { access } = useAuth();
  // valores financeiros: quem não tem o financeiro só visualiza
  const locked = disabled || (!allowAnyone && !access.canFinance);
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
        onBlur={onBlur}
        placeholder={placeholder}
        className={`pl-10 ${className || ''}`}
        disabled={locked}
        title={locked && !disabled ? 'Somente visualização' : undefined}
      />
    </div>
  );
}
