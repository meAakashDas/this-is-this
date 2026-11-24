import React from 'react';
import { Mail, Phone, MessageSquare, Globe, AlertCircle, Info } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground m-0">
          Direct Contact Information
        </h3>
        <p className="text-xs text-muted-foreground m-0">
          Configure how visitors, collaborators, and students can reach out to you directly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Primary Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-primary" />
            <span>Primary Contact Email</span>
          </label>
          <input
            type="email"
            value={contact.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="contact@aakashdas.live"
            className={`w-full text-xs font-mono rounded-lg border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 ${
              errors.email
                ? 'border-destructive focus:ring-destructive'
                : 'border-input focus:ring-primary'
            }`}
          />
          {errors.email ? (
            <div className="text-[11px] text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.email}</span>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground m-0">
              Displayed in the Get in Touch button on the public About page.
            </p>
          )}
        </div>

        {/* Secondary / Admin Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Secondary / Personal Email (Optional)</span>
          </label>
          <input
            type="email"
            value={contact.secondaryEmail || ''}
            onChange={(e) => handleChange('secondaryEmail', e.target.value)}
            placeholder="aakashdas.photo@gmail.com"
            className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[11px] text-muted-foreground m-0">
            For private administrative records and notifications.
          </p>
        </div>

        {/* WhatsApp Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>WhatsApp Number</span>
          </label>
          <input
            type="text"
            value={contact.whatsappNumber}
            onChange={(e) => handleChange('whatsappNumber', e.target.value)}
            placeholder="97798XXXXXXXX (International without +)"
            className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[11px] text-muted-foreground m-0">
            Used for direct WhatsApp chat generation (e.g. <code className="bg-secondary px-1 rounded">https://wa.me/977XXXXXXXXXX</code>).
          </p>
        </div>

        {/* Direct Phone Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-primary" />
            <span>Phone Number</span>
          </label>
          <input
            type="text"
            value={contact.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+977-98XXXXXXXX"
            className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[11px] text-muted-foreground m-0">
            Standard telephone format with country code.
          </p>
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>Location / Base City</span>
          </label>
          <input
            type="text"
            value={contact.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="Kathmandu, Nepal"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[11px] text-muted-foreground m-0">
            Displayed in footer metadata and personal credentials.
          </p>
        </div>

        {/* Custom Contact / Booking URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Custom Contact / Booking URL (Optional)</span>
          </label>
          <input
            type="url"
            value={contact.contactUrl || ''}
            onChange={(e) => handleChange('contactUrl', e.target.value)}
            placeholder="https://cal.com/aakashdas"
            className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[11px] text-muted-foreground m-0">
            Optional external booking or inquiry link.
          </p>
        </div>
      </div>
    </div>
  );
};
