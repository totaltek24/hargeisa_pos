import { useState } from 'react';
import { DollarSign, Delete, Check } from 'lucide-react';

interface QuickSaleProps {
  onAddToCart: (amount: number, currency: 'USD' | 'SLSH') => void;
  exchangeRate: number;
}

export default function QuickSale({ onAddToCart, exchangeRate }: QuickSaleProps) {
  const [currency, setCurrency] = useState<'USD' | 'SLSH'>('USD');
  const [display, setDisplay] = useState('0');

  const handleNumberClick = (num: string) => {
    if (display === '0') {
      setDisplay(num);
    } else if (display.length < 10) {
      setDisplay(display + num);
    }
  };

  const handleDecimal = () => {
    if (!display.includes('.') && currency === 'USD') {
      setDisplay(display + '.');
    }
  };

  const handleClear = () => {
    setDisplay('0');
  };

  const handleBackspace = () => {
    if (display.length === 1) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handleConfirm = () => {
    const amount = parseFloat(display);
    if (amount > 0) {
      onAddToCart(amount, currency);
      setDisplay('0');
    }
  };

  const formatDisplay = () => {
    const num = parseFloat(display);
    if (currency === 'USD') {
      return `$${display}`;
    } else {
      return `${parseInt(display).toLocaleString()} SLSH`;
    }
  };

  const getEquivalent = () => {
    const num = parseFloat(display);
    if (num === 0) return '';

    if (currency === 'USD') {
      const slsh = Math.round(num * exchangeRate);
      return `≈ ${slsh.toLocaleString()} SLSH`;
    } else {
      const usd = (num / exchangeRate).toFixed(2);
      return `≈ $${usd}`;
    }
  };

  const keypadButtons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', 'back'
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
      <div className="mb-3 sm:mb-4">
        <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
          Quick Sale - Enter Amount
        </label>

        {/* Currency Toggle */}
        <div className="grid grid-cols-2 gap-2 mb-3 sm:mb-4">
          <button
            onClick={() => {
              setCurrency('USD');
              setDisplay('0');
            }}
            className={`py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all ${
              currency === 'USD'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            USD ($)
          </button>
          <button
            onClick={() => {
              setCurrency('SLSH');
              setDisplay('0');
            }}
            className={`py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all ${
              currency === 'SLSH'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            SLSH
          </button>
        </div>

        {/* Display */}
        <div className="bg-slate-900 text-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="text-2xl sm:text-3xl font-bold text-right mb-1">
            {formatDisplay()}
          </div>
          <div className="text-xs sm:text-sm text-slate-400 text-right">
            {getEquivalent()}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 mb-3 sm:mb-4">
          {keypadButtons.map((btn, index) => {
            if (btn === 'back') {
              return (
                <button
                  key={index}
                  onClick={handleBackspace}
                  className="bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-700 p-3 sm:p-4 rounded-lg font-bold text-lg sm:text-xl transition-colors flex items-center justify-center"
                >
                  <Delete className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              );
            }
            if (btn === '.') {
              return (
                <button
                  key={index}
                  onClick={handleDecimal}
                  disabled={currency === 'SLSH'}
                  className={`p-3 sm:p-4 rounded-lg font-bold text-lg sm:text-xl transition-colors ${
                    currency === 'SLSH'
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : 'bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-700'
                  }`}
                >
                  {btn}
                </button>
              );
            }
            return (
              <button
                key={index}
                onClick={() => handleNumberClick(btn)}
                className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 p-3 sm:p-4 rounded-lg font-bold text-lg sm:text-xl transition-colors"
              >
                {btn}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleClear}
            className="py-2.5 sm:py-3 bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 rounded-lg font-semibold text-sm sm:text-base transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleConfirm}
            disabled={parseFloat(display) === 0}
            className="py-2.5 sm:py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg font-semibold text-sm sm:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2"
          >
            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>

      <div className="text-[10px] sm:text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-2">
        <DollarSign className="w-3 h-3 inline mr-1" />
        Enter the amount and click "Add to Cart" to process payment
      </div>
    </div>
  );
}
