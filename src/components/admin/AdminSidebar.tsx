import React from 'react';
import {
  LayoutDashboard,
  User,
  Home,
  FileText,
  BookOpen,
  PenSquare,
  Settings,
  Globe,
} from 'lucide-react';

export type AdminTab =
  | 'overview'
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

interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  phase?: string;
  ready?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, ready: true },
  { id: 'profile', label: 'Profile', icon: User, ready: true },
  { id: 'homepage', label: 'Homepage', icon: Home, ready: true },
  { id: 'about', label: 'About', icon: FileText, ready: true },
  { id: 'resources', label: 'Resources', icon: BookOpen, ready: true },
  { id: 'journal', label: 'Journal', icon: PenSquare, ready: true },
  { id: 'publishing', label: 'Publishing', icon: Globe, ready: true },
  { id: 'settings', label: 'Website Settings', icon: Settings, ready: true },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <aside className="w-full lg:w-64 shrink-0">
      {/* Navigation List */}
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
              className={`inline-flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer text-left w-auto lg:w-full ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <IconComponent
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.phase && (
                <span
                  className={`hidden lg:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-secondary text-muted-foreground border border-border'
                  }`}
                >
                  {item.phase}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
