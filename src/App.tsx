import React, { useState, useEffect } from 'react';
import { POSProvider } from './POSContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { POSPage } from './components/pages/POSPage';
import { InventoryPage } from './components/pages/InventoryPage';
import { CustomersPage } from './components/pages/CustomersPage';
import { ReportsPage } from './components/pages/ReportsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ExpenseTracking } from './components/ExpenseTracking';
import { TaxManagement } from './components/TaxManagement';
import { CashierLogin } from './components/CashierLogin';
import { OpenDrawerModal } from './components/OpenDrawerModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { LoggedInCashier } from './types';
import { storage } from './storage';

function App() {
  const [currentPage, setCurrentPage] = useState('pos');
  const [loggedInCashier, setLoggedInCashier] = useState<LoggedInCashier | null>(null);
  const [showOpenDrawer, setShowOpenDrawer] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [managerMode, setManagerMode] = useState(() => {
    return localStorage.getItem('managerMode') === 'true';
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (loggedInCashier) {
      const openDrawer = storage.getOpenCashDrawer();
      if (!openDrawer || openDrawer.openedBy !== loggedInCashier.name) {
        const today = new Date().toISOString().split('T')[0];
        const drawersToday = storage.getCashDrawers().filter(d => {
          const drawerDate = new Date(d.openedAt).toISOString().split('T')[0];
          return drawerDate === today && d.openedBy === loggedInCashier.name;
        });

        if (drawersToday.length === 0) {
          setShowOpenDrawer(true);
        }
      }
    }
  }, [loggedInCashier]);

  useEffect(() => {
    if (isMobile && !managerMode && currentPage !== 'pos') {
      setCurrentPage('pos');
    }
  }, [isMobile, managerMode, currentPage]);

  const handleLogout = () => {
    setLoggedInCashier(null);
    setCurrentPage('pos');
  };

  const toggleManagerMode = () => {
    const newMode = !managerMode;
    setManagerMode(newMode);
    localStorage.setItem('managerMode', String(newMode));
    if (!newMode) {
      setCurrentPage('pos');
    }
  };

  if (!loggedInCashier) {
    return <CashierLogin onLoginSuccess={setLoggedInCashier} />;
  }

  if (showOpenDrawer) {
    return <OpenDrawerModal cashierName={loggedInCashier.name} onComplete={() => setShowOpenDrawer(false)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AnalyticsDashboard />;
      case 'pos':
        return <POSPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'customers':
        return <CustomersPage />;
      case 'expenses':
        return <ExpenseTracking />;
      case 'tax':
        return <TaxManagement />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <POSPage />;
    }
  };

  const showSidebar = !isMobile || managerMode;

  return (
    <POSProvider cashier={loggedInCashier}>
      <div className="fixed inset-0 flex flex-col bg-slate-100">
        <div className="flex flex-1 min-h-0">
          {showSidebar && (
            <Sidebar
              currentPage={currentPage}
              onNavigate={setCurrentPage}
              isMobileMenuOpen={isMobileMenuOpen}
              onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
              isMobile={isMobile}
              managerMode={managerMode}
            />
          )}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <div className="flex-shrink-0">
              <Header
                cashier={loggedInCashier}
                onLogout={handleLogout}
                onMenuClick={() => setIsMobileMenuOpen(true)}
                isMobile={isMobile}
                managerMode={managerMode}
                onToggleManagerMode={toggleManagerMode}
              />
            </div>
            <div className="flex-1 min-h-0">
              {renderPage()}
            </div>
          </div>
        </div>
        <PWAInstallPrompt />
      </div>
    </POSProvider>
  );
}

export default App;
