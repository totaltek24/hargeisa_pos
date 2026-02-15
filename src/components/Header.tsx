import { useState } from 'react';
import { Languages, DollarSign, User, LogOut, Menu, Shield } from 'lucide-react';
import { usePOS } from '../POSContext';
import { LoggedInCashier } from '../types';

interface HeaderProps {
  cashier?: LoggedInCashier | null;
  onLogout?: () => void;
  onMenuClick?: () => void;
  isMobile?: boolean;
  managerMode?: boolean;
  onToggleManagerMode?: () => void;
}

export function Header({ cashier, onLogout, onMenuClick, isMobile, managerMode, onToggleManagerMode }: HeaderProps) {
  const { settings, updateSettings, t, role } = usePOS();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const toggleLanguage = () => {
    updateSettings({ language: settings.language === 'en' ? 'so' : 'en' });
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    onLogout?.();
  };

  return (
    <>
      <div className="bg-white border-b border-slate-200 px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1 overflow-hidden">
            {isMobile && managerMode && (
              <button
                onClick={onMenuClick}
                className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg flex-shrink-0"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
              </button>
            )}

            <h2 className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold text-slate-800 truncate min-w-0">
              {settings.businessName}
            </h2>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            {cashier && (
              <div className="hidden sm:flex items-center gap-2 text-sm bg-green-100 px-2 md:px-3 py-2 rounded-lg">
                <User className="w-4 h-4 text-green-700 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-green-700 text-xs md:text-sm">{cashier.name}</span>
                  {role && (
                    <span className="text-xs text-green-600">{role.name}</span>
                  )}
                </div>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-2 text-sm bg-slate-100 px-3 py-2 rounded-lg">
              <DollarSign className="w-4 h-4" />
              <span className="font-semibold whitespace-nowrap">
                $1 = {settings.exchangeRate.toLocaleString()}
              </span>
            </div>

            {isMobile && onToggleManagerMode && (
              <button
                onClick={onToggleManagerMode}
                className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 rounded-lg transition-colors active:scale-95 ${
                  managerMode
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
                title={managerMode ? 'Cashier Mode' : 'Manager Mode'}
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium">{managerMode ? 'MGR' : 'CSH'}</span>
              </button>
            )}

            <button
              onClick={toggleLanguage}
              className="flex items-center gap-0.5 sm:gap-1 md:gap-2 px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors active:scale-95"
            >
              <Languages className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs md:text-sm font-medium">{settings.language.toUpperCase()}</span>
            </button>

            {onLogout && (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors active:scale-95"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
                <span className="hidden md:inline text-sm font-medium">Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-slate-800">Logout</h3>
              <p className="text-slate-600">
                Are you sure you want to logout? This will end your session.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
