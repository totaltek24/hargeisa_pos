import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Package } from 'lucide-react';
import type { Product, ProductVariant } from '../types';
import { storage } from '../storage';

interface ProductVariantsManagerProps {
  product: Product;
  onClose: () => void;
}

export function ProductVariantsManager({ product, onClose }: ProductVariantsManagerProps) {
  const [variants, setVariants] = useState<ProductVariant[]>(
    storage.getProductVariants().filter(v => v.productId === product.id)
  );
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    priceUsd: '',
    stockQuantity: '',
    attributes: {} as Record<string, string>,
  });

  const handleAddAttribute = () => {
    const key = prompt('Enter attribute name (e.g., "Size", "Color"):');
    if (!key) return;
    const value = prompt(`Enter value for ${key}:`);
    if (!value) return;
    setFormData(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value },
    }));
  };

  const handleRemoveAttribute = (key: string) => {
    setFormData(prev => {
      const newAttributes = { ...prev.attributes };
      delete newAttributes[key];
      return { ...prev, attributes: newAttributes };
    });
  };

  const handleSaveVariant = () => {
    const price = parseFloat(formData.priceUsd);
    const stock = parseInt(formData.stockQuantity, 10);

    if (!formData.name || isNaN(price) || isNaN(stock)) {
      alert('Please fill in all required fields with valid values');
      return;
    }

    if (editingVariant) {
      const updatedVariant: ProductVariant = {
        ...editingVariant,
        name: formData.name,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
        priceUsd: price,
        stockQuantity: stock,
        attributes: formData.attributes,
      };
      storage.updateProductVariant(editingVariant.id, updatedVariant);
    } else {
      const newVariant: ProductVariant = {
        id: crypto.randomUUID(),
        productId: product.id,
        name: formData.name,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
        priceUsd: price,
        stockQuantity: stock,
        attributes: formData.attributes,
        isActive: true,
      };
      storage.addProductVariant(newVariant);
    }

    setVariants(storage.getProductVariants().filter(v => v.productId === product.id));
    handleCancelEdit();
  };

  const handleEditVariant = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      name: variant.name,
      sku: variant.sku || '',
      barcode: variant.barcode || '',
      priceUsd: variant.priceUsd.toString(),
      stockQuantity: variant.stockQuantity.toString(),
      attributes: variant.attributes,
    });
    setIsAddingVariant(true);
  };

  const handleDeleteVariant = (variantId: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;
    storage.deleteProductVariant(variantId);
    setVariants(storage.getProductVariants().filter(v => v.productId === product.id));
  };

  const handleCancelEdit = () => {
    setIsAddingVariant(false);
    setEditingVariant(null);
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      priceUsd: '',
      stockQuantity: '',
      attributes: {},
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg text-slate-800">Product Variants</h3>
          <p className="text-sm text-slate-600">{product.nameEn}</p>
        </div>
        {!isAddingVariant && (
          <button
            onClick={() => setIsAddingVariant(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Variant
          </button>
        )}
      </div>

      {isAddingVariant && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h4 className="font-semibold text-slate-800 mb-4">
            {editingVariant ? 'Edit Variant' : 'New Variant'}
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Variant Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Large Blue Shirt"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={e => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price (USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.priceUsd}
                  onChange={e => setFormData(prev => ({ ...prev, priceUsd: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock Quantity *</label>
                <input
                  type="number"
                  value={formData.stockQuantity}
                  onChange={e => setFormData(prev => ({ ...prev, stockQuantity: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">Attributes</label>
                <button
                  onClick={handleAddAttribute}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Attribute
                </button>
              </div>
              {Object.entries(formData.attributes).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(formData.attributes).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 bg-slate-50 rounded px-3 py-2">
                      <span className="text-sm font-medium text-slate-700">{key}:</span>
                      <span className="text-sm text-slate-600">{value}</span>
                      <button
                        onClick={() => handleRemoveAttribute(key)}
                        className="ml-auto text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No attributes added</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCancelEdit}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVariant}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                {editingVariant ? 'Update' : 'Create'} Variant
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {variants.length > 0 ? (
          variants.map(variant => (
            <div key={variant.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-slate-600" />
                    <h4 className="font-semibold text-slate-800">{variant.name}</h4>
                    {!variant.isActive && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">Inactive</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {variant.sku && (
                      <div>
                        <span className="text-slate-600">SKU:</span>
                        <span className="ml-1 font-medium">{variant.sku}</span>
                      </div>
                    )}
                    {variant.barcode && (
                      <div>
                        <span className="text-slate-600">Barcode:</span>
                        <span className="ml-1 font-medium">{variant.barcode}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-600">Price:</span>
                      <span className="ml-1 font-medium text-green-600">${variant.priceUsd.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Stock:</span>
                      <span className="ml-1 font-medium">{variant.stockQuantity}</span>
                    </div>
                  </div>
                  {Object.entries(variant.attributes).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(variant.attributes).map(([key, value]) => (
                        <span key={key} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-3">
                  <button
                    onClick={() => handleEditVariant(variant)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteVariant(variant.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-2 text-slate-400" />
            <p className="text-slate-600">No variants created yet</p>
            <p className="text-sm text-slate-500 mt-1">Add variants to offer different options for this product</p>
          </div>
        )}
      </div>
    </div>
  );
}
