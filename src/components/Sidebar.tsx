import React from 'react';
import { ShoppingCart, Package, Users, FileText, Settings, Wifi, WifiOff, BarChart3, Receipt, DollarSign, X } from 'lucide-react';
import { usePOS } from '../POSContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isMobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
  isMobile?: boolean;
  managerMode?: boolean;
}

export function Sidebar({ currentPage, onNavigate, isMobileMenuOpen, onCloseMobileMenu, isMobile, managerMode }: SidebarProps) {
  const { t, syncStatus, hasPermission, hasAnyPermission, isOwner, permissionsLoading } = usePOS();

  const simplifiedMode = isMobile && !managerMode;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      permission: 'view_sales_reports'
    },
    {
      id: 'pos',
      label: t('pos'),
      icon: ShoppingCart,
      permission: 'make_sales'
    },
    {
      id: 'inventory',
      label: t('inventory'),
      icon: Package,
      permission: 'view_inventory'
    },
    {
      id: 'customers',
      label: t('customers'),
      icon: Users,
      permission: 'view_customers'
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: DollarSign,
      permission: 'view_expenses'
    },
    {
      id: 'tax',
      label: 'Tax Management',
      icon: Receipt,
      permission: 'view_taxes'
    },
    {
      id: 'reports',
      label: t('reports'),
      icon: FileText,
      permissions: ['view_sales_reports', 'view_inventory_reports', 'view_employee_reports']
    },
    {
      id: 'settings',
      label: t('settings'),
      icon: Settings,
      permission: 'view_settings'
    },
  ];

  let visibleMenuItems = menuItems.filter(item => {
    if (simplifiedMode && item.id !== 'pos') {
      return false;
    }

    if (permissionsLoading) return true;

    if (isOwner()) return true;

    if (item.permissions) {
      return hasAnyPermission(item.permissions);
    }

    if (item.permission) {
      return hasPermission(item.permission);
    }

    return true;
  });

  if (visibleMenuItems.length === 0 && !permissionsLoading) {
    const posItem = menuItems.find(item => item.id === 'pos');
    if (posItem) {
      visibleMenuItems.push(posItem);
    }
  }

  const handleNavigate = (page: string) => {
    onNavigate(page);
    onCloseMobileMenu?.();
  };

  return (
    <>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onCloseMobileMenu}
        />
      )}

      <div className={`
        fixed md:relative inset-y-0 left-0 z-50
        w-72 md:w-64 bg-slate-900 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">{t('appName')}</h1>
          <button
            onClick={onCloseMobileMenu}
            className="md:hidden text-white hover:text-slate-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {visibleMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-100 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-sm">
            {syncStatus.isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-slate-200">{t('online')}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-400" />
                <span className="text-slate-200">{t('offline')}</span>
              </>
            )}
          </div>
          {syncStatus.lastSynced && (
            <div className="text-xs text-slate-300 mt-1">
              {t('lastSynced')}: {new Date(syncStatus.lastSynced).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
