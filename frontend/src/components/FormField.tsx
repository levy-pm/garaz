import { UseFormRegister, FieldErrors } from 'react-hook-form';

interface Props {
  label: string;
  name: string;
  register: UseFormRegister<any>;
  errors: FieldErrors;
  type?: string;
  required?: boolean;
  step?: string;
  placeholder?: string;
}

export default function FormField({ label, name, register, errors, type = 'text', required, step, placeholder }: Props) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14 }}>
        {label} {required && <span style={{ color: '#e94560' }}>*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          {...register(name, { required: required ? `${label} jest wymagane` : false })}
          placeholder={placeholder}
          style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', minHeight: 80 }}
        />
      ) : (
        <input
          type={type}
          step={step}
          {...register(name, {
            required: required ? `${label} jest wymagane` : false,
            valueAsNumber: type === 'number',
          })}
          placeholder={placeholder}
          style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
      )}
      {errors[name] && (
        <span style={{ color: '#e94560', fontSize: 12 }}>{errors[name]?.message as string}</span>
      )}
    </div>
  );
}
