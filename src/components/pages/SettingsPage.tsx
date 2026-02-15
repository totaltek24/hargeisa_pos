import React, { useState, useEffect, useRef } from 'react';
import { Save, DollarSign, Building2, Globe, Plus, X, UserCheck, Trash2, Percent, Smartphone, CreditCard, Zap, Download, FileSpreadsheet, Database, Upload, AlertCircle } from 'lucide-react';
import { usePOS } from '../../POSContext';
import { storage } from '../../storage';
import { supabase } from '../../services/supabaseClient';
import type { Cashier, QuantityDiscount, Product, Category, Role } from '../../types';
import {
  exportSalesReceiptsToQuickBooks,
  exportCustomersToQuickBooks,
  exportInventoryToQuickBooks,
  exportDailySalesToQuickBooks,
  exportCashDrawersToQuickBooks,
  exportAllAccountingData
} from '../../quickbooksExport';
import { exportFullBackup, importFullBackup } from '../../dataBackup';
import { RolePermissionManager } from '../RolePermissionManager';

export function SettingsPage() {
  const { settings, updateSettings, t, refreshData } = usePOS();
  const [localSettings, setLocalSettings] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [showAddCashierModal, setShowAddCashierModal] = useState(false);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [newCashier, setNewCashier] = useState({ name: '', pin: '', roleId: '' });
  const [showAddDiscountModal, setShowAddDiscountModal] = useState(false);
  const [discounts, setDiscounts] = useState(storage.getQuantityDiscounts());
  const [newDiscount, setNewDiscount] = useState<{
    productId?: string;
    categoryId?: string;
    minQuantity: number;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  }>({
    minQuantity: 2,
    discountType: 'percentage',
    discountValue: 10,
  });
  const products = storage.getProducts();
  const categories = storage.getCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'payments' | 'data'>('general');

  const [paymentProviders, setPaymentProviders] = useState({
    zaad: { merchantPhone: '', isActive: true },
    edahab: { merchantPhone: '', isActive: true },
    waafi: { merchantPhone: '', apiKey: '', apiSecret: '', merchantCode: '', isActive: false },
    sifalo: { username: '', password: '', isActive: false },
  });
  const [providersSaved, setProvidersSaved] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [settingUpTestCreds, setSettingUpTestCreds] = useState(false);

  useEffect(() => {
    loadPaymentProviders();
    loadCashiers();
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('level');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadCashiers = async () => {
    try {
      const { data, error } = await supabase
        .from('cashiers')
        .select('*, roles(*)')
        .order('name');

      if (error) throw error;
      setCashiers(data || []);
    } catch (error) {
      console.error('Error loading cashiers:', error);
      setCashiers(storage.getCashiers());
    }
  };

  const loadPaymentProviders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingProviders(false);
        return;
      }

      const { data, error } = await supabase
        .from('payment_provider_settings')
        .select('*')
        .eq('merchant_id', user.id)
        .in('provider', ['zaad', 'edahab', 'waafi', 'sifalo']);

      if (error) throw error;

      if (data && data.length > 0) {
        const newProviders = { ...paymentProviders };
        data.forEach(provider => {
          if (provider.provider === 'zaad') {
            newProviders.zaad = {
              merchantPhone: provider.merchant_phone || '',
              isActive: provider.is_active !== false,
            };
          } else if (provider.provider === 'edahab') {
            newProviders.edahab = {
              merchantPhone: provider.merchant_phone || '',
              isActive: provider.is_active !== false,
            };
          } else if (provider.provider === 'waafi') {
            newProviders.waafi = {
              merchantPhone: provider.merchant_phone || '',
              apiKey: provider.api_key || '',
              apiSecret: provider.api_secret || '',
              merchantCode: provider.merchant_code || '',
              isActive: provider.is_active || false,
            };
          } else if (provider.provider === 'sifalo') {
            newProviders.sifalo = {
              username: provider.merchant_code || '',
              password: provider.api_key || '',
              isActive: provider.is_active || false,
            };
          }
        });
        setPaymentProviders(newProviders);
      }
    } catch (error) {
      console.error('Error loading payment providers:', error);
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleSetupTestCredentials = async () => {
    setSettingUpTestCreds(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in first');
        return;
      }

      const { data, error } = await supabase.rpc('setup_waafi_test_credentials', {
        p_merchant_id: user.id,
        p_merchant_code: 'TEST_MERCHANT',
        p_merchant_phone: '+252000000000',
      });

      if (error) throw error;

      setPaymentProviders({
        ...paymentProviders,
        waafi: {
          merchantPhone: '+252000000000',
          apiKey: 'key9HFXDP',
          apiSecret: 'a9b5a04e79ea2f40e1ce2840e0b406feda354555',
          merchantCode: 'TEST_MERCHANT',
          isActive: true,
        },
      });

      alert('Test credentials configured successfully! You can now test Waafi payments.');
    } catch (error) {
      console.error('Error setting up test credentials:', error);
      alert('Failed to setup test credentials. Please try manually.');
    } finally {
      setSettingUpTestCreds(false);
    }
  };

  const handleSavePaymentProviders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to save payment settings');
        return;
      }

      const updates = [
        {
          merchant_id: user.id,
          provider: 'zaad',
          merchant_phone: paymentProviders.zaad.merchantPhone,
          merchant_name: localSettings.businessName,
          is_active: paymentProviders.zaad.isActive,
          updated_at: new Date().toISOString(),
        },
        {
          merchant_id: user.id,
          provider: 'edahab',
          merchant_phone: paymentProviders.edahab.merchantPhone,
          merchant_name: localSettings.businessName,
          is_active: paymentProviders.edahab.isActive,
          updated_at: new Date().toISOString(),
        },
        {
          merchant_id: user.id,
          provider: 'waafi',
          merchant_phone: paymentProviders.waafi.merchantPhone,
          merchant_name: localSettings.businessName,
          api_key: paymentProviders.waafi.apiKey,
          api_secret: paymentProviders.waafi.apiSecret,
          merchant_code: paymentProviders.waafi.merchantCode,
          is_active: paymentProviders.waafi.isActive,
          updated_at: new Date().toISOString(),
        },
        {
          merchant_id: user.id,
          provider: 'sifalo',
          merchant_code: paymentProviders.sifalo.username,
          merchant_name: localSettings.businessName,
          api_key: paymentProviders.sifalo.password,
          is_active: paymentProviders.sifalo.isActive,
          updated_at: new Date().toISOString(),
        },
      ];

      const { error } = await supabase
        .from('payment_provider_settings')
        .upsert(updates);

      if (error) throw error;

      setProvidersSaved(true);
      setTimeout(() => setProvidersSaved(false), 2000);
    } catch (error) {
      console.error('Error saving payment providers:', error);
      alert('Failed to save payment settings');
    }
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddCashier = async () => {
    if (!newCashier.name.trim() || !newCashier.roleId) {
      alert('Please enter a name and select a role');
      return;
    }

    try {
      const cashierId = `CASH${Math.floor(1000 + Math.random() * 9000)}`;

      const { data, error } = await supabase
        .from('cashiers')
        .insert({
          name: newCashier.name,
          cashier_id: cashierId,
          pin: newCashier.pin || '0000',
          role_id: newCashier.roleId,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      await loadCashiers();
      setShowAddCashierModal(false);
      setNewCashier({ name: '', pin: '', roleId: '' });
      alert(`User created successfully! Cashier ID: ${cashierId}`);
    } catch (error) {
      console.error('Error adding cashier:', error);
      alert('Failed to add user. Please try again.');
    }
  };

  const handleToggleCashier = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('cashiers')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      await loadCashiers();
    } catch (error) {
      console.error('Error toggling cashier:', error);
      storage.updateCashier(id, { isActive: !isActive });
      setCashiers(storage.getCashiers());
    }
  };

  const handleAddDiscount = () => {
    if (newDiscount.minQuantity < 1 || newDiscount.discountValue <= 0) return;

    const discount: QuantityDiscount = {
      id: crypto.randomUUID(),
      productId: newDiscount.productId,
      categoryId: newDiscount.categoryId,
      minQuantity: newDiscount.minQuantity,
      discountType: newDiscount.discountType,
      discountValue: newDiscount.discountValue,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    storage.addQuantityDiscount(discount);
    setDiscounts(storage.getQuantityDiscounts());
    setShowAddDiscountModal(false);
    setNewDiscount({
      minQuantity: 2,
      discountType: 'percentage',
      discountValue: 10,
    });
  };

  const handleToggleDiscount = (id: string, isActive: boolean) => {
    storage.updateQuantityDiscount(id, { isActive: !isActive });
    setDiscounts(storage.getQuantityDiscounts());
  };

  const handleDeleteDiscount = (id: string) => {
    if (confirm('Are you sure you want to delete this discount rule?')) {
      storage.deleteQuantityDiscount(id);
      setDiscounts(storage.getQuantityDiscounts());
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importFullBackup(file);
      refreshData();
      alert('Backup imported successfully!');
    } catch (error) {
      alert('Failed to import backup. Please check the file and try again.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">{t('settings')}</h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'general'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            General Settings
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Users & Roles
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'payments'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Payment Settings
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'data'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Data & Export
          </button>
        </div>

        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <>
            <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Building2 className="w-4 h-4" />
                  Business Name
                </label>
                <input
                  type="text"
                  value={localSettings.businessName}
                  onChange={e => setLocalSettings({ ...localSettings, businessName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <DollarSign className="w-4 h-4" />
                  {t('exchangeRate')} (1 USD = X SLSH)
                </label>
                <input
                  type="number"
                  value={localSettings.exchangeRate}
                  onChange={e => setLocalSettings({ ...localSettings, exchangeRate: parseFloat(e.target.value) || 0 })}
                  step="1"
                  min="1"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Current rate: 1 USD = {localSettings.exchangeRate.toLocaleString()} SLSH
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Globe className="w-4 h-4" />
                  Default Language
                </label>
                <select
                  value={localSettings.language}
                  onChange={e => setLocalSettings({ ...localSettings, language: e.target.value as 'en' | 'so' })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="so">Somali</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={localSettings.taxRate}
                  onChange={e => setLocalSettings({ ...localSettings, taxRate: parseFloat(e.target.value) || 0 })}
                  step="0.1"
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Save className="w-5 h-5" />
                  {saved ? 'Saved!' : t('save')}
                </button>
              </div>
            </div>

            <div className="mt-6 bg-white rounded-lg border border-slate-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Percent className="w-5 h-5" />
                  Tax Configuration
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Optional tax system for business reporting. Configure how tax is calculated and applied.
                </p>
              </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <label className="font-medium text-slate-800">Enable Tax System</label>
                <p className="text-sm text-slate-600">Turn on optional tax calculations</p>
              </div>
              <button
                onClick={() => setLocalSettings({ ...localSettings, taxEnabled: !localSettings.taxEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  localSettings.taxEnabled ? 'bg-green-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    localSettings.taxEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {localSettings.taxEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tax Type</label>
                  <select
                    value={localSettings.taxType}
                    onChange={e => setLocalSettings({ ...localSettings, taxType: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentage-based (%)</option>
                    <option value="fixed">Fixed Amount per Item ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tax Value {localSettings.taxType === 'percentage' ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    value={localSettings.taxValue}
                    onChange={e => setLocalSettings({ ...localSettings, taxValue: parseFloat(e.target.value) || 0 })}
                    step={localSettings.taxType === 'percentage' ? '0.1' : '0.01'}
                    min="0"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tax Application Mode</label>
                  <select
                    value={localSettings.taxApplicationMode}
                    onChange={e => setLocalSettings({ ...localSettings, taxApplicationMode: e.target.value as 'included' | 'added' })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="included">Tax Included in Price</option>
                    <option value="added">Tax Added on Top of Price</option>
                  </select>
                  <p className="text-xs text-slate-600 mt-1">
                    {localSettings.taxApplicationMode === 'included'
                      ? 'Tax will be calculated from the total price'
                      : 'Tax will be added to the subtotal'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Apply Tax To</label>
                  <select
                    value={localSettings.taxScope}
                    onChange={e => setLocalSettings({ ...localSettings, taxScope: e.target.value as 'all' | 'category' | 'product' })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Items</option>
                    <option value="category">Selected Categories</option>
                    <option value="product">Individual Products</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This system is for internal business reporting only.
                    Tax is not automatically remitted to government. Use Reports section to generate summaries for tax authorities.
                  </p>
                </div>
              </>
            )}
              </div>
            </div>

            <div className="mt-6 bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Quantity Discount Rules</h3>
                  <p className="text-sm text-slate-600">Automatic discounts based on quantity purchased</p>
                </div>
                <button
                  onClick={() => setShowAddDiscountModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Rule
                </button>
              </div>

              <div className="space-y-2">
                {discounts.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Percent className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No discount rules yet</p>
                  </div>
                ) : (
                  discounts.map(discount => {
                    const product = products.find(p => p.id === discount.productId);
                    const category = categories.find(c => c.id === discount.categoryId);

                    return (
                      <div key={discount.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">
                            {product ? product.nameEn : category ? category.nameEn : 'All Products'}
                          </div>
                          <div className="text-sm text-slate-600">
                            Buy {discount.minQuantity}+ get{' '}
                            {discount.discountType === 'percentage'
                              ? `${discount.discountValue}% off`
                              : `$${discount.discountValue} off each`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleDiscount(discount.id, discount.isActive)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              discount.isActive
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {discount.isActive ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={() => handleDeleteDiscount(discount.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Offline-First Design</h3>
              <p className="text-sm text-blue-800">
                This POS system works completely offline. All data is stored locally on your device.
                The sync indicator in the sidebar shows your connection status. Your data is safe even during power cuts.
              </p>
            </div>

            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2">Barcode Scanner Support</h3>
              <p className="text-sm text-slate-700">
                Connect any USB barcode scanner to your tablet. The system automatically detects scanned barcodes
                and adds products to the cart. No configuration needed.
              </p>
            </div>
          </>
        )}

        {/* Users & Roles Tab */}
        {activeTab === 'users' && (
          <>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">User Management</h3>
                  <p className="text-sm text-slate-600">Manage users and their access</p>
                </div>
                <button
                  onClick={() => setShowAddCashierModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add User
                </button>
              </div>

              <div className="space-y-2">
                {cashiers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No users added yet</p>
                  </div>
                ) : (
                  cashiers.map(cashier => (
                    <div key={cashier.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div>
                        <div className="font-semibold text-slate-800">{cashier.name}</div>
                        <div className="text-sm text-slate-600">
                          {cashier.roles?.name || 'No role assigned'} • {cashier.cashier_id || 'No ID'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {cashier.pin ? 'PIN Protected' : 'No PIN'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleCashier(cashier.id, cashier.is_active ?? cashier.isActive ?? false)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          (cashier.is_active ?? cashier.isActive)
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {(cashier.is_active ?? cashier.isActive) ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6">
              <RolePermissionManager />
            </div>
          </>
        )}

        {/* Payment Settings Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Mobile Money Payment Settings
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Configure merchant numbers for each payment provider. QR codes will be generated automatically.
              </p>
            </div>

            {loadingProviders ? (
              <div className="text-center py-4 text-slate-500">Loading...</div>
            ) : (
              <div className="space-y-6">
              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-bold text-green-900">Zaad Service</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Merchant Phone Number
                  </label>
                  <input
                    type="tel"
                    value={paymentProviders.zaad.merchantPhone}
                    onChange={e => setPaymentProviders({
                      ...paymentProviders,
                      zaad: { ...paymentProviders.zaad, merchantPhone: e.target.value }
                    })}
                    placeholder="252-XX-XXXXXXX"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-slate-600 mt-1">This number will be shown as a QR code and text</p>
                </div>
              </div>

              <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-bold text-orange-900">eDahab Service</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Merchant Phone Number
                  </label>
                  <input
                    type="tel"
                    value={paymentProviders.edahab.merchantPhone}
                    onChange={e => setPaymentProviders({
                      ...paymentProviders,
                      edahab: { ...paymentProviders.edahab, merchantPhone: e.target.value }
                    })}
                    placeholder="252-XX-XXXXXXX"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-slate-600 mt-1">This number will be shown as a QR code and text</p>
                </div>
              </div>

              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-bold text-purple-900">Waafi Service</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Merchant Phone Number
                    </label>
                    <input
                      type="tel"
                      value={paymentProviders.waafi.merchantPhone}
                      onChange={e => setPaymentProviders({
                        ...paymentProviders,
                        waafi: { ...paymentProviders.waafi, merchantPhone: e.target.value }
                      })}
                      placeholder="252-XX-XXXXXXX"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-slate-600 mt-1">This number will be shown as a QR code and text</p>
                  </div>

                  <div className="pt-3 border-t border-purple-200">
                    <p className="text-sm font-medium text-slate-700 mb-2">Optional: API Integration</p>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={paymentProviders.waafi.merchantCode}
                        onChange={e => setPaymentProviders({
                          ...paymentProviders,
                          waafi: { ...paymentProviders.waafi, merchantCode: e.target.value }
                        })}
                        placeholder="Waafi Merchant Code (optional)"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="text"
                        value={paymentProviders.waafi.apiKey}
                        onChange={e => setPaymentProviders({
                          ...paymentProviders,
                          waafi: { ...paymentProviders.waafi, apiKey: e.target.value }
                        })}
                        placeholder="API Key (optional)"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="password"
                        value={paymentProviders.waafi.apiSecret}
                        onChange={e => setPaymentProviders({
                          ...paymentProviders,
                          waafi: { ...paymentProviders.waafi, apiSecret: e.target.value }
                        })}
                        placeholder="API Secret (optional)"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={handleSetupTestCredentials}
                        disabled={settingUpTestCreds}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                      >
                        <Zap className="w-4 h-4" />
                        {settingUpTestCreds ? 'Setting up...' : 'Quick Setup Test Credentials'}
                      </button>
                      <p className="text-xs text-slate-600 mt-1">
                        Click to automatically configure test API credentials for Waafi Pay
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="waafi-api-active"
                          checked={paymentProviders.waafi.isActive}
                          onChange={e => setPaymentProviders({
                            ...paymentProviders,
                            waafi: { ...paymentProviders.waafi, isActive: e.target.checked }
                          })}
                          className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-2 focus:ring-purple-500"
                        />
                        <label htmlFor="waafi-api-active" className="text-sm text-slate-700">
                          Enable Waafi API integration
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-bold text-blue-900">Sifalo Pay API (Zaad & eDahab)</h4>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg mb-3">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Sifalo Pay API enables automated payment processing for Zaad and eDahab.
                      Customer enters their phone number directly in your POS without scanning QR codes.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      API Username
                    </label>
                    <input
                      type="text"
                      value={paymentProviders.sifalo.username}
                      onChange={e => setPaymentProviders({
                        ...paymentProviders,
                        sifalo: { ...paymentProviders.sifalo, username: e.target.value }
                      })}
                      placeholder="Enter your Sifalo API username"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      API Password
                    </label>
                    <input
                      type="password"
                      value={paymentProviders.sifalo.password}
                      onChange={e => setPaymentProviders({
                        ...paymentProviders,
                        sifalo: { ...paymentProviders.sifalo, password: e.target.value }
                      })}
                      placeholder="Enter your Sifalo API password"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sifalo-api-active"
                      checked={paymentProviders.sifalo.isActive}
                      onChange={e => setPaymentProviders({
                        ...paymentProviders,
                        sifalo: { ...paymentProviders.sifalo, isActive: e.target.checked }
                      })}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="sifalo-api-active" className="text-sm text-slate-700">
                      Enable Sifalo Pay API integration
                    </label>
                  </div>

                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      <strong>How to get credentials:</strong> Visit <a href="https://developer.sifalopay.com/" target="_blank" rel="noopener noreferrer" className="underline">developer.sifalopay.com</a> to register and obtain your API credentials.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSavePaymentProviders}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Save className="w-5 h-5" />
                  {providersSaved ? 'Saved!' : 'Save Payment Settings'}
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Each payment provider can have its own merchant number</li>
                  <li>QR codes are automatically generated for each number</li>
                  <li>Cashier selects which payment method customer wants to use</li>
                  <li>Customer scans QR code or enters number manually on their phone</li>
                </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Data & Export Tab */}
        {activeTab === 'data' && (
          <>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Data Backup</h3>
                  <p className="text-sm text-slate-600">Export and import complete system data</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={exportFullBackup}
                  className="flex items-center justify-between p-4 border-2 border-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
                >
                  <div className="text-left">
                    <div className="font-semibold text-blue-800">Export Full Backup</div>
                    <div className="text-sm text-blue-700">All data in JSON format</div>
                  </div>
                  <Download className="w-5 h-5 text-blue-600" />
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                >
                  <div className="text-left">
                    <div className="font-semibold text-slate-800 group-hover:text-blue-700">Import Backup</div>
                    <div className="text-sm text-slate-600">Restore from backup file</div>
                  </div>
                  <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />

              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-semibold mb-1">Important:</p>
                    <p>Importing a backup will replace all current data. Make sure to export a backup first before importing.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">QuickBooks Export</h3>
                  <p className="text-sm text-slate-600">Export data for accounting purposes</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => exportSalesReceiptsToQuickBooks()}
                  className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
                >
                  <div className="text-left">
                    <div className="font-semibold text-slate-800 group-hover:text-green-700">Sales Receipts</div>
                    <div className="text-sm text-slate-600">All completed transactions</div>
                  </div>
                  <Download className="w-5 h-5 text-slate-400 group-hover:text-green-600" />
                </button>

                <button
                  onClick={() => exportDailySalesToQuickBooks(selectedDate)}
                  className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
                >
                  <div className="text-left">
                    <div className="font-semibold text-slate-800 group-hover:text-green-700">Daily Sales Summary</div>
                    <div className="text-sm text-slate-600">Journal entries for today</div>
                  </div>
                  <Download className="w-5 h-5 text-slate-400 group-hover:text-green-600" />
                </button>

                <button
                  onClick={() => exportCustomersToQuickBooks()}
                  className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
                >
                  <div className="text-left">
                    <div className="font-semibold text-slate-800 group-hover:text-green-700">Customer List</div>
                    <div className="text-sm text-slate-600">All customers with balances</div>
                  </div>
                  <Download className="w-5 h-5 text-slate-400 group-hover:text-green-600" />
                </button>

                <button
                  onClick={() => exportInventoryToQuickBooks()}
                  className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
                >
                  <div className="text-left">
                    <div className="font-semibold text-slate-800 group-hover:text-green-700">Inventory Items</div>
                    <div className="text-sm text-slate-600">Products with stock levels</div>
                  </div>
                  <Download className="w-5 h-5 text-slate-400 group-hover:text-green-600" />
                </button>

                <button
                  onClick={() => exportCashDrawersToQuickBooks()}
                  className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
                >
                  <div className="text-left">
                    <div className="font-semibold text-slate-800 group-hover:text-green-700">Cash Drawer History</div>
                    <div className="text-sm text-slate-600">All drawer reconciliations</div>
                  </div>
                  <Download className="w-5 h-5 text-slate-400 group-hover:text-green-600" />
                </button>

                <button
                  onClick={() => exportAllAccountingData()}
                  className="flex items-center justify-between p-4 border-2 border-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
                >
                  <div className="text-left">
                    <div className="font-semibold text-green-800">Export All Data</div>
                    <div className="text-sm text-green-700">Complete accounting package</div>
                  </div>
                  <Download className="w-5 h-5 text-green-600" />
                </button>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">QuickBooks Import Instructions:</p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Download the CSV file(s) you need</li>
                      <li>In QuickBooks, go to File → Import → IIF or CSV</li>
                      <li>Select the downloaded CSV file</li>
                      <li>Map the columns to QuickBooks fields</li>
                      <li>Review and complete the import</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showAddCashierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Add User</h3>
              <button onClick={() => setShowAddCashierModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  User Name *
                </label>
                <input
                  type="text"
                  value={newCashier.name}
                  onChange={e => setNewCashier({ ...newCashier, name: e.target.value })}
                  placeholder="Enter user name"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role *
                </label>
                <select
                  value={newCashier.roleId}
                  onChange={e => setNewCashier({ ...newCashier, roleId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a role</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Defines access permissions for this user
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  PIN *
                </label>
                <input
                  type="password"
                  value={newCashier.pin}
                  onChange={e => setNewCashier({ ...newCashier, pin: e.target.value })}
                  placeholder="4-6 digit PIN"
                  maxLength={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Leave empty to use default PIN (0000)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  A unique User ID will be generated automatically for login purposes.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddCashierModal(false);
                    setNewCashier({ name: '', pin: '', roleId: '' });
                  }}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCashier}
                  disabled={!newCashier.name.trim() || !newCashier.roleId}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Add Discount Rule</h3>
              <button onClick={() => setShowAddDiscountModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Apply to
                </label>
                <select
                  value={newDiscount.productId || newDiscount.categoryId || 'all'}
                  onChange={e => {
                    const value = e.target.value;
                    if (value === 'all') {
                      setNewDiscount({ ...newDiscount, productId: undefined, categoryId: undefined });
                    } else if (value.startsWith('product-')) {
                      setNewDiscount({ ...newDiscount, productId: value.replace('product-', ''), categoryId: undefined });
                    } else if (value.startsWith('category-')) {
                      setNewDiscount({ ...newDiscount, categoryId: value.replace('category-', ''), productId: undefined });
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Products</option>
                  <optgroup label="Categories">
                    {categories.map(cat => (
                      <option key={cat.id} value={`category-${cat.id}`}>
                        {cat.nameEn}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Products">
                    {products.map(prod => (
                      <option key={prod.id} value={`product-${prod.id}`}>
                        {prod.nameEn}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Minimum Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={newDiscount.minQuantity}
                  onChange={e => setNewDiscount({ ...newDiscount, minQuantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Discount Type
                </label>
                <select
                  value={newDiscount.discountType}
                  onChange={e => setNewDiscount({ ...newDiscount, discountType: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percentage">Percentage Off</option>
                  <option value="fixed">Fixed Amount Off (USD)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Discount Value
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newDiscount.discountValue}
                  onChange={e => setNewDiscount({ ...newDiscount, discountValue: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {newDiscount.discountType === 'percentage' ? 'Percentage (e.g., 10 for 10%)' : 'Amount in USD per item'}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddDiscountModal(false)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDiscount}
                  disabled={newDiscount.minQuantity < 1 || newDiscount.discountValue <= 0}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
