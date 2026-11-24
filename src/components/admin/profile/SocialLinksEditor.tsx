import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  ExternalLink,
  Share2,
  AlertCircle,
} from 'lucide-react';
import type { CmsSocialLink, SocialPlatformIcon } from '../../../types/cms/siteSettings.ts';

interface SocialLinksEditorProps {
  links: CmsSocialLink[];
  onChange: (links: CmsSocialLink[]) => void;
}

const PLATFORM_OPTIONS: Array<{
  platform: string;
  icon: SocialPlatformIcon;
  defaultDomain: string;
}> = [
  { platform: 'YouTube', icon: 'youtube', defaultDomain: 'https://youtube.com/@' },
  { platform: 'Instagram', icon: 'instagram', defaultDomain: 'https://instagram.com/' },
  { platform: 'LinkedIn', icon: 'linkedin', defaultDomain: 'https://linkedin.com/in/' },
  { platform: 'X (Twitter)', icon: 'twitter', defaultDomain: 'https://x.com/' },
  { platform: 'TikTok', icon: 'tiktok', defaultDomain: 'https://tiktok.com/@' },
  { platform: 'Facebook', icon: 'facebook', defaultDomain: 'https://facebook.com/' },
  { platform: 'GitHub', icon: 'link', defaultDomain: 'https://github.com/' },
  { platform: 'Custom', icon: 'link', defaultDomain: 'https://' },
];

export const SocialLinksEditor: React.FC<SocialLinksEditorProps> = ({
  links,
  onChange,
}) => {
  const [newPlatform, setNewPlatform] = useState('YouTube');
  const [newLabel, setNewLabel] = useState('');
  const [newHandle, setNewHandle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = (index: number, field: keyof CmsSocialLink, value: any) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleToggleVisibility = (index: number) => {
    const updated = [...links];
    updated[index] = { ...updated[index], featured: !updated[index].featured };
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = links.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...links];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    // update order numbers
    updated.forEach((item, idx) => (item.order = idx + 1));
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === links.length - 1) return;
    const updated = [...links];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    // update order numbers
    updated.forEach((item, idx) => (item.order = idx + 1));
    onChange(updated);
  };

  const handleAdd = () => {
    setError(null);
    if (!newUrl.trim()) {
      setError('Profile URL cannot be empty.');
      return;
    }

    try {
      const parsed = new URL(newUrl.trim());
      if (!['https:', 'http:'].includes(parsed.protocol)) {
        setError('URL must begin with https:// or http://');
        return;
      }
    } catch {
      setError('Please enter a valid URL (e.g. https://youtube.com/@username)');
      return;
    }

    const platformMeta =
      PLATFORM_OPTIONS.find((p) => p.platform === newPlatform) || PLATFORM_OPTIONS[0];

    const newItem: CmsSocialLink = {
      id: `social-${Date.now()}`,
      order: links.length + 1,
      visible: true,
      platform: newPlatform,
      label: newLabel.trim() || newPlatform,
      handle: newHandle.trim() || '@me.aakashdas',
      url: newUrl.trim(),
      icon: platformMeta.icon,
      featured: true,
    };

    onChange([...links, newItem]);
    setNewLabel('');
    setNewHandle('');
    setNewUrl('');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground m-0">
          Social Media Channels & Profiles
        </h3>
        <p className="text-xs text-muted-foreground m-0">
          Manage the public links that appear in the Get in Touch section on the About page
          and in the website footer.
        </p>
      </div>

      {/* Social Links List */}
      <div className="space-y-3">
        {links.map((link, index) => (
          <div
            key={link.id || index}
            className={`rounded-xl border p-4 space-y-3 transition-all ${
              link.featured
                ? 'bg-card border-border shadow-2xs'
                : 'bg-secondary/30 border-border/60 opacity-65'
            }`}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {link.platform}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {link.handle}
                </span>
                {!link.featured && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                    Hidden
                  </span>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title={link.featured ? 'Hide on website' : 'Show on website'}
                  onClick={() => handleToggleVisibility(index)}
                  className={`w-7 h-7 inline-flex items-center justify-center rounded-md border text-xs transition-colors cursor-pointer ${
                    link.featured
                      ? 'border-border bg-background hover:bg-secondary text-foreground'
                      : 'border-border/60 bg-secondary text-muted-foreground'
                  }`}
                >
                  {link.featured ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  title="Move link up"
                  disabled={index === 0}
                  onClick={() => handleMoveUp(index)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-secondary text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  title="Move link down"
                  disabled={index === links.length - 1}
                  onClick={() => handleMoveDown(index)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-secondary text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  title="Delete social link"
                  onClick={() => handleRemove(index)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/15 transition-colors cursor-pointer ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => handleUpdate(index, 'label', e.target.value)}
                  className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                  Handle
                </label>
                <input
                  type="text"
                  value={link.handle}
                  onChange={(e) => handleUpdate(index, 'handle', e.target.value)}
                  className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                  Target URL
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => handleUpdate(index, 'url', e.target.value)}
                    className="flex-1 text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Channel Card */}
      <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 space-y-3">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-primary" />
          <span>Add Social Channel</span>
        </label>

        {error && (
          <div className="text-xs text-destructive flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-muted-foreground mb-1">
              Platform
            </label>
            <select
              value={newPlatform}
              onChange={(e) => {
                setNewPlatform(e.target.value);
                const opt = PLATFORM_OPTIONS.find((p) => p.platform === e.target.value);
                if (opt && !newUrl) {
                  setNewUrl(opt.defaultDomain);
                }
              }}
              className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {PLATFORM_OPTIONS.map((opt) => (
                <option key={opt.platform} value={opt.platform}>
                  {opt.platform}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-muted-foreground mb-1">
              Label
            </label>
            <input
              type="text"
              placeholder={newPlatform}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-muted-foreground mb-1">
              Handle
            </label>
            <input
              type="text"
              placeholder="@me.aakashdas"
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
              className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-muted-foreground mb-1">
              URL
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Social Link</span>
          </button>
        </div>
      </div>
    </div>
  );
};
