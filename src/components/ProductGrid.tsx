import React, { useState, useEffect, useRef } from 'react';
import { Search, AlertCircle, Plus, Package } from 'lucide-react';
import { usePOS } from '../POSContext';
import type { Product } from '../types';

export function ProductGrid() {
  const { products, categories, addToCart, t, settings, formatCurrency } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const barcodeTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && (e.target as HTMLInputElement).type === 'text') {
        return;
      }

      if (e.key === 'Enter' && barcodeBuffer) {
        const product = products.find(p => p.barcode === barcodeBuffer);
        if (product) {
          addToCart(product);
        }
        setBarcodeBuffer('');
      } else if (e.key.length === 1) {
        setBarcodeBuffer(prev => prev + e.key);

        if (barcodeTimeoutRef.current) {
          clearTimeout(barcodeTimeoutRef.current);
        }
        barcodeTimeoutRef.current = setTimeout(() => {
          setBarcodeBuffer('');
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, [barcodeBuffer, products, addToCart]);

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.nameSo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.includes(searchQuery);
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory && product.isActive;
  });

  const getProductName = (product: Product) => {
    return settings.language === 'en' ? product.nameEn : product.nameSo;
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '';
    return settings.language === 'en' ? category.nameEn : category.nameSo;
  };

  return (
    <div className="h-full flex flex-col bg-white min-h-0">
      <input
        ref={barcodeInputRef}
        type="text"
        className="absolute -left-[9999px]"
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className="p-3 md:p-4 lg:p-6 border-b border-slate-200 space-y-3 md:space-y-4 flex-shrink-0 bg-white z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('searchProducts')}
            className="w-full pl-10 pr-4 py-3 md:py-3.5 text-base bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2.5 md:py-2 rounded-lg whitespace-nowrap transition-colors font-medium text-sm md:text-base active:scale-95 ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('allCategories')}
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2.5 md:py-2 rounded-lg whitespace-nowrap transition-colors font-medium text-sm md:text-base active:scale-95 ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {settings.language === 'en' ? category.nameEn : category.nameSo}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-3 md:p-4 lg:p-6 pb-24 lg:pb-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
            {filteredProducts.map(product => {
              const isLowStock = product.stockQuantity <= product.restockThreshold;
              const currency = formatCurrency(product.priceUsd);

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all active:scale-98"
                >
                  <div className="aspect-square bg-slate-100 relative">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={getProductName(product)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Package className="w-12 h-12 md:w-16 md:h-16" />
                      </div>
                    )}
                    {isLowStock && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span className="hidden sm:inline">{t('stockAlert')}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 md:p-4">
                    <h3 className="font-semibold text-sm md:text-base text-slate-800 mb-1 line-clamp-2 min-h-[2.5rem] md:min-h-[3rem]">
                      {getProductName(product)}
                    </h3>
                    <p className="text-xs text-slate-500 mb-2 truncate">{getCategoryName(product.categoryId)}</p>

                    <div className="space-y-1 mb-3">
                      <div className="text-base md:text-lg font-bold text-blue-600">{currency.usd}</div>
                      <div className="text-xs md:text-sm text-slate-600">{currency.slsh}</div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-500">
                        {t('stock')}: {product.stockQuantity}
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stockQuantity === 0}
                      className={`w-full py-3 md:py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm md:text-base active:scale-95 ${
                        product.stockQuantity === 0
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      }`}
                    >
                      <Plus className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden sm:inline">{t('addToCart')}</span>
                      <span className="sm:hidden">Add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
