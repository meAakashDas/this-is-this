import React from 'react';

export interface ContactInfoState {
  email: string;
  secondaryEmail?: string;
  phone: string;
  whatsappNumber: string;
  contactUrl?: string;
  location: string;
}

interface ContactEditorProps {
  contact: ContactInfoState;
  onChange: (contact: ContactInfoState) => void;
  errors?: Partial<Record<keyof ContactInfoState, string>>;
}

export const ContactEditor: React.FC<ContactEditorProps> = ({
  contact,
  onChange,
  errors = {},
}) => {
  const handleChange = (field: keyof ContactInfoState, value: string) => {
    onChange({
      ...contact,
      [field]: value,
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <label htmlFor="profile-contact-email" className="text-xs font-medium text-foreground block">
          Email Address
        </label>
        <input
          id="profile-contact-email"
          type="email"
          value={contact.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="contact@aakashdas.live"
          className={`w-full text-xs font-mono rounded-lg border bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 ${
            errors.email
              ? 'border-destructive focus:ring-destructive/20'
              : 'border-input focus:ring-primary/20'
          }`}
        />
        {errors.email && (
          <p className="text-[11px] text-destructive m-0">{errors.email}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="profile-contact-phone" className="text-xs font-medium text-foreground block">
          Phone Number
        </label>
        <input
          id="profile-contact-phone"
          type="text"
          value={contact.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="+977-98XXXXXXXX"
          className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2 sm:max-w-sm">
        <label htmlFor="profile-contact-whatsapp" className="text-xs font-medium text-foreground block">
          WhatsApp Number
        </label>
        <input
          id="profile-contact-whatsapp"
          type="text"
          value={contact.whatsappNumber}
          onChange={(e) => handleChange('whatsappNumber', e.target.value)}
          placeholder="97798XXXXXXXX"
          className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </div>
  );
};
