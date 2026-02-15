import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { storage } from '../storage';
import { Cashier, LoggedInCashier } from '../types';
import { LogIn, Store } from 'lucide-react';

interface CashierLoginProps {
  onLoginSuccess: (cashier: LoggedInCashier) => void;
}

export function CashierLogin({ onLoginSuccess }: CashierLoginProps) {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [selectedCashierId, setSelectedCashierId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCashiers();
  }, []);

  const fetchCashiers = async () => {
    try {
      const { data, error: err } = await supabase
        .from('cashiers')
        .select('*, roles(*)')
        .eq('is_active', true)
        .order('name');

      if (err) throw err;
      setCashiers(data || []);
      if (data && data.length > 0) {
        setSelectedCashierId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching cashiers:', err);
      setError('Failed to load cashiers');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedCashierId || !pin) {
      setError('Please select a cashier and enter PIN');
      return;
    }

    const selectedCashier = cashiers.find(c => c.id === selectedCashierId);
    if (!selectedCashier) {
      setError('Cashier not found');
      return;
    }

    if (selectedCashier.pin !== pin) {
      setError('Invalid PIN');
      setPin('');
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: existingClockIn, error: checkError } = await supabase
        .from('time_clock_entries')
        .select('id')
        .eq('cashier_id', selectedCashier.id)
        .gte('clock_in', today.toISOString())
        .maybeSingle();

      if (checkError) {
        console.error('Error checking clock-in:', checkError);
      }

      if (!existingClockIn) {
        const { error: clockInError } = await supabase
          .from('time_clock_entries')
          .insert({
            cashier_id: selectedCashier.id,
            clock_in: new Date().toISOString(),
          });

        if (clockInError) {
          console.error('Error clocking in:', clockInError);
        }
      }
    } catch (err) {
      console.error('Error with clock-in process:', err);
    }

    onLoginSuccess({
      id: selectedCashier.id,
      name: selectedCashier.name,
      cashier_id: selectedCashier.cashier_id,
      role_id: selectedCashier.role_id,
    });
  };

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  const settings = storage.getSettings();
  const businessName = settings.businessName || 'My Business';

  return (
    <div className="h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">{businessName}</h2>

          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl shadow-lg">
              <Store className="w-16 h-16 text-white" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <LogIn className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-800">POS Login</h1>
          </div>
        </div>

        <p className="text-center text-slate-600 mb-8">Select your name and enter PIN</p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Select Cashier
            </label>
            <select
              value={selectedCashierId}
              onChange={e => setSelectedCashierId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white text-slate-800 font-medium"
            >
              {cashiers.map(cashier => (
                <option key={cashier.id} value={cashier.id}>
                  {cashier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Enter PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Enter your PIN"
              maxLength={6}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 text-center text-2xl tracking-widest font-semibold"
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  handleLogin(e as any);
                }
              }}
              autoFocus
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
