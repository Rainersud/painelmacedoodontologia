import { z } from 'zod';

// Maximum lengths for text fields
const MAX_NOTES_LENGTH = 5000;
const MAX_NAME_LENGTH = 100;
const MAX_PHONE_LENGTH = 20;
const MAX_TREATMENT_TYPE_LENGTH = 100;

// Brazilian phone regex pattern (accepts various formats)
const phoneRegex = /^(\+55\s?)?\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}$/;

// Appointment validation schema
export const appointmentSchema = z.object({
  lead_id: z.string().uuid({ message: 'ID do paciente inválido' }),
  scheduled_at: z.string()
    .min(1, { message: 'Data e hora são obrigatórios' })
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date > new Date();
    }, { message: 'A data deve ser no futuro' }),
  treatment_type: z.string()
    .max(MAX_TREATMENT_TYPE_LENGTH, { message: `Tipo de tratamento deve ter no máximo ${MAX_TREATMENT_TYPE_LENGTH} caracteres` })
    .optional(),
  notes: z.string()
    .max(MAX_NOTES_LENGTH, { message: `Observações devem ter no máximo ${MAX_NOTES_LENGTH} caracteres` })
    .optional(),
});

// Call log validation schema
export const callLogSchema = z.object({
  call_type: z.enum(['inbound', 'outbound'], { message: 'Tipo de ligação inválido' }),
  duration_minutes: z.string()
    .refine((val) => {
      if (val === '') return true;
      const num = parseInt(val);
      return !isNaN(num) && num >= 0 && num <= 480; // Max 8 hours
    }, { message: 'Duração em minutos deve ser entre 0 e 480' }),
  duration_seconds: z.string()
    .refine((val) => {
      if (val === '') return true;
      const num = parseInt(val);
      return !isNaN(num) && num >= 0 && num <= 59;
    }, { message: 'Segundos deve ser entre 0 e 59' }),
  result: z.string().min(1, { message: 'Resultado é obrigatório' }),
  notes: z.string()
    .max(MAX_NOTES_LENGTH, { message: `Observações devem ter no máximo ${MAX_NOTES_LENGTH} caracteres` })
    .optional(),
});

// Deal closing validation schema
export const closingDealSchema = z.object({
  treatment_value: z.string()
    .min(1, { message: 'Valor do tratamento é obrigatório' })
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0 && num <= 10000000; // Max 10M
    }, { message: 'Valor deve ser maior que 0 e no máximo R$ 10.000.000' }),
  payment_method: z.enum(['avista', 'parcelado'], { message: 'Forma de pagamento inválida' }),
  notes: z.string()
    .max(MAX_NOTES_LENGTH, { message: `Observações devem ter no máximo ${MAX_NOTES_LENGTH} caracteres` })
    .optional(),
});

// Profile update validation schema
export const profileUpdateSchema = z.object({
  full_name: z.string()
    .min(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
    .max(MAX_NAME_LENGTH, { message: `Nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres` })
    .regex(/^[\p{L}\s'-]+$/u, { message: 'Nome contém caracteres inválidos' }),
  phone: z.string()
    .max(MAX_PHONE_LENGTH, { message: `Telefone deve ter no máximo ${MAX_PHONE_LENGTH} caracteres` })
    .refine((val) => {
      if (!val || val.trim() === '') return true; // Phone is optional
      return phoneRegex.test(val.replace(/\s/g, ''));
    }, { message: 'Formato de telefone inválido. Use: (11) 99999-9999' })
    .optional()
    .transform((val) => val?.trim() || ''),
});

// Goal creation validation schema
export const goalSchema = z.object({
  type: z.enum([
    'leads_atendidos',
    'consultas_agendadas', 
    'taxa_conversao',
    'taxa_comparecimento',
    'receita',
    'resgatados',
    'fechados'
  ], { message: 'Tipo de meta inválido' }),
  period: z.enum(['diario', 'semanal', 'mensal'], { message: 'Período inválido' }),
  target_value: z.string()
    .min(1, { message: 'Valor alvo é obrigatório' })
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0 && num <= 100000000; // Max 100M
    }, { message: 'Valor deve ser maior que 0' }),
});

// Incentive plan validation schema
export const incentivePlanSchema = z.object({
  name: z.string()
    .min(3, { message: 'Nome deve ter pelo menos 3 caracteres' })
    .max(100, { message: 'Nome deve ter no máximo 100 caracteres' }),
  target_type: z.enum(['agendamentos', 'comparecimentos', 'resgatados', 'fechados'], { 
    message: 'Tipo de meta inválido' 
  }),
  period: z.enum(['diario', 'semanal', 'mensal'], { message: 'Período inválido' }),
  target_value: z.string()
    .min(1, { message: 'Meta é obrigatória' })
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num > 0 && num <= 10000;
    }, { message: 'Meta deve ser um número entre 1 e 10.000' }),
  bonus_value: z.string()
    .min(1, { message: 'Valor do bônus é obrigatório' })
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0 && num <= 100000;
    }, { message: 'Bônus deve ser um valor entre R$ 0,01 e R$ 100.000' }),
});

// Revenue validation
export const revenueSchema = z.string()
  .refine((val) => {
    if (!val) return false;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 10000000;
  }, { message: 'Valor inválido (0 a 10.000.000)' });

// Helper function to safely validate and return errors
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: boolean; 
  data?: T; 
  errors?: Record<string, string> 
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
}
