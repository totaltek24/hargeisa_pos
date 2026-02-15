import React, { useState } from 'react';
import { Package, AlertCircle, Plus, MessageSquare, X, Edit, TrendingUp, Minus, Download, Layers, Upload, Camera, Scan } from 'lucide-react';
import { usePOS } from '../../POSContext';
import { storage } from '../../storage';
import { supabase } from '../../services/supabaseClient';
import type { Product } from '../../types';
import { LowStockAlerts } from '../LowStockAlerts';
import { InventoryAdjustmentModal } from '../InventoryAdjustmentModal';
import { ProductVariantsManager } from '../ProductVariantsManager';
import { BatchImportExport } from '../BatchImportExport';
import { BarcodeScanner } from '../BarcodeScanner';

type ModalType = 'add' | 'edit' | 'adjust' | 'receive' | 'restock' | 'variants' | null;
type ViewMode = 'products' | 'batch' | 'lowstock';

export function InventoryPage() {
  const { products, categories, t, settings, formatCurrency, refreshData } = usePOS();
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('products');
  const [productForm, setProductForm] = useState({
    nameEn: '',
    nameSo: '',
    barcode: '',
    priceUsd: '',
    categoryId: categories[0]?.id || '',
    stockQuantity: '',
    restockThreshold: '10',
    imageUrl: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState({ quantity: '', reason: '' });
  const restockList = storage.getRestockList();

  const lowStockProducts = products.filter(
    p => p.stockQuantity <= p.restockThreshold && p.isActive
  );

  const handleAddToRestock = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = restockList.find(item => item.productId === productId);
    if (existing) return;

    const restockItem = {
      id: crypto.randomUUID(),
      productId,
      quantityNeeded: product.restockThreshold * 2,
      priority: 'medium' as const,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    storage.addRestockItem(restockItem);
    refreshData();
  };

  const generateRestockWhatsApp = () => {
    const message = restockList
      .filter(item => item.status === 'pending')
      .map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return '';
        const name = settings.language === 'en' ? product.nameEn : product.nameSo;
        return `- ${name} (${item.quantityNeeded} units)`;
      })
      .join('\n');

    return encodeURIComponent(`*Restock Order*\n\n${message}\n\nPlease confirm availability and pricing.`);
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return '';
    return settings.language === 'en' ? product.nameEn : product.nameSo;
  };

  const openAddModal = () => {
    setProductForm({
      nameEn: '',
      nameSo: '',
      barcode: '',
      priceUsd: '',
      categoryId: categories[0]?.id || '',
      stockQuantity: '0',
      restockThreshold: '10',
      imageUrl: '',
    });
    setSelectedFile(null);
    setImagePreview('');
    setModalType('add');
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      nameEn: product.nameEn,
      nameSo: product.nameSo,
      barcode: product.barcode || '',
      priceUsd: product.priceUsd.toString(),
      categoryId: product.categoryId,
      stockQuantity: product.stockQuantity.toString(),
      restockThreshold: product.restockThreshold.toString(),
      imageUrl: product.imageUrl || '',
    });
    setSelectedFile(null);
    setImagePreview(product.imageUrl || '');
    setModalType('edit');
  };

  const openAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setStockAdjustment({ quantity: '', reason: '' });
    setModalType('adjust');
  };

  const openReceiveModal = () => {
    setStockAdjustment({ quantity: '', reason: 'Supplier delivery' });
    setModalType('receive');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    try {
      setUploading(true);
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `products/${crypto.randomUUID()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        alert('Failed to upload image: ' + error.message);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    setProductForm({ ...productForm, barcode });
    setShowScanner(false);

    const existingProduct = products.find(p => p.barcode === barcode);
    if (existingProduct) {
      const shouldEdit = confirm(`Product "${existingProduct.nameEn}" already exists with this barcode. Would you like to edit it instead?`);
      if (shouldEdit) {
        openEditModal(existingProduct);
      }
    }
  };

  const handleSaveProduct = async () => {
    const priceUsd = parseFloat(productForm.priceUsd);
    const stockQuantity = parseInt(productForm.stockQuantity);
    const restockThreshold = parseInt(productForm.restockThreshold);

    if (!productForm.nameEn || !productForm.priceUsd || isNaN(priceUsd)) return;

    let imageUrl = productForm.imageUrl;

    if (selectedFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }

    if (modalType === 'add') {
      const newProduct: Product = {
        id: crypto.randomUUID(),
        nameEn: productForm.nameEn,
        nameSo: productForm.nameSo || productForm.nameEn,
        barcode: productForm.barcode || undefined,
        priceUsd,
        categoryId: productForm.categoryId,
        stockQuantity: isNaN(stockQuantity) ? 0 : stockQuantity,
        restockThreshold: isNaN(restockThreshold) ? 10 : restockThreshold,
        imageUrl: imageUrl || undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      storage.addProduct(newProduct);
    } else if (modalType === 'edit' && selectedProduct) {
      storage.updateProduct(selectedProduct.id, {
        nameEn: productForm.nameEn,
        nameSo: productForm.nameSo || productForm.nameEn,
        barcode: productForm.barcode || undefined,
        priceUsd,
        categoryId: productForm.categoryId,
        stockQuantity: isNaN(stockQuantity) ? selectedProduct.stockQuantity : stockQuantity,
        restockThreshold: isNaN(restockThreshold) ? 10 : restockThreshold,
        imageUrl: imageUrl || undefined,
      });
    }

    refreshData();
    setModalType(null);
    setSelectedProduct(null);
    setSelectedFile(null);
    setImagePreview('');
  };

  const handleStockAdjustment = () => {
    if (!selectedProduct || !stockAdjustment.quantity) return;

    const adjustment = parseInt(stockAdjustment.quantity);
    if (isNaN(adjustment)) return;

    const newQuantity = selectedProduct.stockQuantity + adjustment;
    if (newQuantity < 0) return;

    storage.updateProduct(selectedProduct.id, {
      stockQuantity: newQuantity,
    });

    refreshData();
    setModalType(null);
    setSelectedProduct(null);
  };

  const handleReceiveStock = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    storage.updateProduct(productId, {
      stockQuantity: product.stockQuantity + quantity,
    });

    const restockItem = restockList.find(item => item.productId === productId);
    if (restockItem) {
      storage.updateRestockItem(restockItem.id, { status: 'received' });
    }
  };

  if (viewMode === 'batch') {
    return (
      <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Batch Import / Export</h2>
            <button
              onClick={() => setViewMode('products')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              <Package className="w-5 h-5" />
              Back to Products
            </button>
          </div>
          <BatchImportExport />
        </div>
      </div>
    );
  }

  if (viewMode === 'lowstock') {
    return (
      <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Low Stock Alerts</h2>
            <button
              onClick={() => setViewMode('products')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              <Package className="w-5 h-5" />
              Back to Products
            </button>
          </div>
          <LowStockAlerts />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <h2 className="text-2xl font-bold text-slate-800">{t('inventory')}</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setViewMode('lowstock')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <AlertCircle className="w-5 h-5" />
              Low Stock ({lowStockProducts.length})
            </button>
            <button
              onClick={() => setViewMode('batch')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              Batch Import/Export
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
            <button
              onClick={openReceiveModal}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <TrendingUp className="w-5 h-5" />
              Receive Stock
            </button>
            <button
              onClick={() => setModalType('restock')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              <AlertCircle className="w-5 h-5" />
              {t('restockList')} ({restockList.filter(i => i.status === 'pending').length})
            </button>
          </div>
        </div>

        <div className="grid gap-4 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              {t('stockAlert')} ({lowStockProducts.length})
            </h3>

            {lowStockProducts.length === 0 ? (
              <p className="text-slate-500">No low stock items</p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map(product => {
                  const name = settings.language === 'en' ? product.nameEn : product.nameSo;
                  const inRestockList = restockList.some(item => item.productId === product.id);

                  return (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800">{name}</div>
                        <div className="text-sm text-slate-600">
                          Stock: {product.stockQuantity} / Threshold: {product.restockThreshold}
                        </div>
                      </div>
                      {!inRestockList ? (
                        <button
                          onClick={() => handleAddToRestock(product.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          {t('addToRestock')}
                        </button>
                      ) : (
                        <div className="text-sm text-green-600 font-medium">In reorder list</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Product</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">{t('category')}</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">{t('price')}</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">{t('stock')}</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {products.map(product => {
                  const name = settings.language === 'en' ? product.nameEn : product.nameSo;
                  const category = categories.find(c => c.id === product.categoryId);
                  const categoryName = category ? (settings.language === 'en' ? category.nameEn : category.nameSo) : '';
                  const isLow = product.stockQuantity <= product.restockThreshold;

                  return (
                    <tr key={product.id} className={isLow ? 'bg-orange-50' : ''}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{name}</div>
                        {product.barcode && (
                          <div className="text-xs text-slate-500">{product.barcode}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{categoryName}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-slate-800">{formatCurrency(product.priceUsd).usd}</div>
                        <div className="text-xs text-slate-500">{formatCurrency(product.priceUsd).slsh}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${isLow ? 'text-orange-600' : 'text-slate-800'}`}>
                          {product.stockQuantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-600 text-white rounded text-xs font-medium">
                            <AlertCircle className="w-3 h-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openAdjustModal(product)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Adjust Stock"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setModalType('variants');
                            }}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                            title="Manage Variants"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalType === 'restock' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">{t('restockList')}</h3>
              <button onClick={() => setModalType(null)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {restockList.filter(item => item.status === 'pending').length === 0 ? (
                <p className="text-center text-slate-500 py-8">No items in reorder list</p>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {restockList
                      .filter(item => item.status === 'pending')
                      .map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div>
                            <div className="font-semibold text-slate-800">{getProductName(item.productId)}</div>
                            <div className="text-sm text-slate-600">Quantity needed: {item.quantityNeeded}</div>
                          </div>
                          <button
                            onClick={() => {
                              storage.deleteRestockItem(item.id);
                              refreshData();
                            }}
                            className="text-red-500 hover:text-red-600"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                  </div>

                  <a
                    href={`https://wa.me/?text=${generateRestockWhatsApp()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Send to Supplier via WhatsApp
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {(modalType === 'add' || modalType === 'edit') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">
                {modalType === 'add' ? 'Add New Product' : 'Edit Product'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Image
                </label>
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center overflow-hidden bg-slate-50">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-12 h-12 text-slate-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="product-image-upload"
                    />
                    <label
                      htmlFor="product-image-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Choose Image
                    </label>
                    <p className="text-xs text-slate-500 mt-2">
                      Recommended: Square image, max 5MB
                    </p>
                    {selectedFile && (
                      <p className="text-sm text-green-600 mt-2">
                        {selectedFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Product Name (English)
                  </label>
                  <input
                    type="text"
                    value={productForm.nameEn}
                    onChange={e => setProductForm({ ...productForm, nameEn: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Product Name (Somali)
                  </label>
                  <input
                    type="text"
                    value={productForm.nameSo}
                    onChange={e => setProductForm({ ...productForm, nameSo: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Barcode
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={productForm.barcode}
                      onChange={e => setProductForm({ ...productForm, barcode: e.target.value })}
                      placeholder="Scan or enter barcode"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <Scan className="w-4 h-4" />
                      Scan with Camera
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category
                  </label>
                  <select
                    value={productForm.categoryId}
                    onChange={e => setProductForm({ ...productForm, categoryId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {settings.language === 'en' ? cat.nameEn : cat.nameSo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.priceUsd}
                    onChange={e => setProductForm({ ...productForm, priceUsd: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={productForm.stockQuantity}
                    onChange={e => setProductForm({ ...productForm, stockQuantity: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Restock Threshold
                  </label>
                  <input
                    type="number"
                    value={productForm.restockThreshold}
                    onChange={e => setProductForm({ ...productForm, restockThreshold: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setModalType(null)}
                  disabled={uploading}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSaveProduct}
                  disabled={!productForm.nameEn || !productForm.priceUsd || uploading}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalType === 'adjust' && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Adjust Stock</h3>
              <button onClick={() => setModalType(null)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="font-semibold text-slate-800 mb-1">
                  {settings.language === 'en' ? selectedProduct.nameEn : selectedProduct.nameSo}
                </div>
                <div className="text-sm text-slate-600">
                  Current Stock: {selectedProduct.stockQuantity}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Adjustment (+/-)
                </label>
                <input
                  type="number"
                  value={stockAdjustment.quantity}
                  onChange={e => setStockAdjustment({ ...stockAdjustment, quantity: e.target.value })}
                  placeholder="e.g. +10 or -5"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">Use + to add stock, - to remove</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason
                </label>
                <input
                  type="text"
                  value={stockAdjustment.reason}
                  onChange={e => setStockAdjustment({ ...stockAdjustment, reason: e.target.value })}
                  placeholder="e.g. Damaged, Lost, Physical count"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setModalType(null)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleStockAdjustment}
                  disabled={!stockAdjustment.quantity}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adjust Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalType === 'receive' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Receive Stock from Supplier</h3>
              <button onClick={() => setModalType(null)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-slate-600 mb-6">Select products from reorder list or add manually:</p>

              {restockList.filter(item => item.status === 'pending').length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-800">Pending Orders:</h4>
                  {restockList
                    .filter(item => item.status === 'pending')
                    .map(item => {
                      const product = products.find(p => p.id === item.productId);
                      if (!product) return null;

                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-semibold text-slate-800">{getProductName(item.productId)}</div>
                            <div className="text-sm text-slate-600">
                              Ordered: {item.quantityNeeded} | Current stock: {product.stockQuantity}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              placeholder="Qty received"
                              className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              id={`receive-${item.id}`}
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById(`receive-${item.id}`) as HTMLInputElement;
                                const qty = parseInt(input.value);
                                if (!isNaN(qty) && qty > 0) {
                                  handleReceiveStock(item.productId, qty);
                                  refreshData();
                                  input.value = '';
                                }
                              }}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                            >
                              Receive
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">No pending orders. Add products to reorder list first.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {modalType === 'variants' && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Product Variants</h3>
              <button onClick={() => {
                setModalType(null);
                setSelectedProduct(null);
                refreshData();
              }} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <ProductVariantsManager
                product={selectedProduct}
                onClose={() => {
                  setModalType(null);
                  setSelectedProduct(null);
                  refreshData();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
