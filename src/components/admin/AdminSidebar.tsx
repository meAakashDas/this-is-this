import React from 'react';
import {
  User,
  Home,
  FileText,
  BookOpen,
  PenSquare,
  Globe,
  Settings,
} from 'lucide-react';

export type AdminTab =
  | 'profile'
  | 'homepage'
  | 'about'
  | 'resources'
  | 'journal'
  | 'publishing'
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
}

const NAV_ITEMS: Array<{
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'homepage', label: 'Homepage', icon: Home },
  { id: 'about', label: 'About', icon: FileText },
  { id: 'resources', label: 'Resources', icon: BookOpen },
  { id: 'journal', label: 'Journal', icon: PenSquare },
  { id: 'publishing', label: 'Publishing', icon: Globe },
  { id: 'settings', label: 'Website Settings', icon: Settings },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <aside className="w-full lg:w-52 shrink-0">
      <nav
        aria-label="Admin Navigation"
        className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none"
      >
        {NAV_ITEMS.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer text-left w-auto lg:w-full ${
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              }`}
            >
              <IconComponent
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
