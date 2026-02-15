import React from 'react';
import { AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { usePOS } from '../POSContext';
import { storage } from '../storage';

export function LowStockAlerts() {
  const { products, t, settings, formatCurrency } = usePOS();

  const lowStockProducts = products.filter(
    p => p.isActive && p.stockQuantity <= p.restockThreshold
  ).sort((a, b) => {
    const aPriority = a.stockQuantity / a.restockThreshold;
    const bPriority = b.stockQuantity / b.restockThreshold;
    return aPriority - bPriority;
  });

  const outOfStockProducts = lowStockProducts.filter(p => p.stockQuantity === 0);
  const criticalStockProducts = lowStockProducts.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.restockThreshold * 0.5);
  const warningStockProducts = lowStockProducts.filter(p => p.stockQuantity > p.restockThreshold * 0.5 && p.stockQuantity <= p.restockThreshold);

  const getProductName = (product: typeof products[0]) => {
    return settings.language === 'en' ? product.nameEn : product.nameSo;
  };

  const getStockStatus = (product: typeof products[0]) => {
    if (product.stockQuantity === 0) {
      return { label: 'Out of Stock', color: 'text-red-700 bg-red-50 border-red-200', icon: AlertTriangle };
    }
    if (product.stockQuantity <= product.restockThreshold * 0.5) {
      return { label: 'Critical', color: 'text-orange-700 bg-orange-50 border-orange-200', icon: TrendingDown };
    }
    return { label: 'Low Stock', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: Package };
  };

  const handleAddToRestockList = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingRestock = storage.getRestockList().find(r => r.productId === productId && r.status !== 'received');
    if (existingRestock) return;

    const priority = product.stockQuantity === 0 ? 'high' : product.stockQuantity <= product.restockThreshold * 0.5 ? 'medium' : 'low';

    storage.addRestockItem({
      id: crypto.randomUUID(),
      productId,
      quantityNeeded: product.restockThreshold * 2,
      priority: priority as 'low' | 'medium' | 'high',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  };

  if (lowStockProducts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Stock Levels</h3>
            <p className="text-sm text-slate-600">All products are well stocked</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Low Stock Alerts</h3>
              <p className="text-sm text-slate-600">{lowStockProducts.length} products need attention</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {outOfStockProducts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Out of Stock ({outOfStockProducts.length})
            </h4>
          </div>
        )}

        {criticalStockProducts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Critical ({criticalStockProducts.length})
            </h4>
          </div>
        )}

        {warningStockProducts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-yellow-700 mb-2 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Warning ({warningStockProducts.length})
            </h4>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {lowStockProducts.map(product => {
            const status = getStockStatus(product);
            const StatusIcon = status.icon;
            const stockPercentage = (product.stockQuantity / product.restockThreshold) * 100;

            return (
              <div
                key={product.id}
                className={`p-3 rounded-lg border ${status.color} transition-colors`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <StatusIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-slate-800 truncate">
                        {getProductName(product)}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium">{status.label}</span>
                        <span className="text-xs text-slate-600">
                          Stock: {product.stockQuantity} / {product.restockThreshold}
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${
                            stockPercentage === 0
                              ? 'bg-red-500'
                              : stockPercentage <= 50
                              ? 'bg-orange-500'
                              : 'bg-yellow-500'
                          }`}
                          style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddToRestockList(product.id)}
                    className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium whitespace-nowrap transition-colors"
                  >
                    Add to Reorder
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
