import React, { useState, useEffect } from 'react';
import { Award, Star, TrendingUp, Gift, Crown } from 'lucide-react';
import { storage } from '../storage';
import type { Customer, LoyaltyProgram } from '../types';

const POINTS_PER_DOLLAR = 10;
const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 1000,
  gold: 5000,
  platinum: 10000,
};

const TIER_BENEFITS = {
  bronze: { discount: 0, name: 'Bronze', icon: Award, color: 'text-amber-700 bg-amber-50' },
  silver: { discount: 5, name: 'Silver', icon: Star, color: 'text-slate-600 bg-slate-100' },
  gold: { discount: 10, name: 'Gold', icon: TrendingUp, color: 'text-yellow-600 bg-yellow-50' },
  platinum: { discount: 15, name: 'Platinum', icon: Crown, color: 'text-purple-600 bg-purple-50' },
};

export function LoyaltyProgramManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgram[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [pointsToAdd, setPointsToAdd] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setCustomers(storage.getCustomers());
    setLoyaltyPrograms(storage.getLoyaltyPrograms());
  };

  const getOrCreateLoyalty = (customerId: string): LoyaltyProgram => {
    let loyalty = loyaltyPrograms.find(lp => lp.customerId === customerId);
    if (!loyalty) {
      loyalty = {
        id: crypto.randomUUID(),
        customerId,
        points: 0,
        tier: 'bronze',
        lifetimePoints: 0,
        lastUpdated: new Date().toISOString(),
      };
      storage.addLoyaltyProgram(loyalty);
      loadData();
    }
    return loyalty;
  };

  const calculateTier = (lifetimePoints: number): 'bronze' | 'silver' | 'gold' | 'platinum' => {
    if (lifetimePoints >= TIER_THRESHOLDS.platinum) return 'platinum';
    if (lifetimePoints >= TIER_THRESHOLDS.gold) return 'gold';
    if (lifetimePoints >= TIER_THRESHOLDS.silver) return 'silver';
    return 'bronze';
  };

  const handleAddPoints = () => {
    if (!selectedCustomer || !pointsToAdd) return;

    const points = parseInt(pointsToAdd, 10);
    if (isNaN(points) || points <= 0) return;

    const loyalty = getOrCreateLoyalty(selectedCustomer);
    const newPoints = loyalty.points + points;
    const newLifetimePoints = loyalty.lifetimePoints + points;
    const newTier = calculateTier(newLifetimePoints);

    storage.updateLoyaltyProgram(loyalty.id, {
      points: newPoints,
      lifetimePoints: newLifetimePoints,
      tier: newTier,
      lastUpdated: new Date().toISOString(),
    });

    loadData();
    setSelectedCustomer('');
    setPointsToAdd('');
  };

  const handleRedeemPoints = (customerId: string, pointsToRedeem: number) => {
    const loyalty = loyaltyPrograms.find(lp => lp.customerId === customerId);
    if (!loyalty || loyalty.points < pointsToRedeem) return;

    storage.updateLoyaltyProgram(loyalty.id, {
      points: loyalty.points - pointsToRedeem,
      lastUpdated: new Date().toISOString(),
    });

    loadData();
  };

  const getPointsValue = (points: number) => {
    return (points / 100).toFixed(2);
  };

  const customersWithLoyalty = customers.map(customer => ({
    ...customer,
    loyalty: loyaltyPrograms.find(lp => lp.customerId === customer.id) || {
      id: '',
      customerId: customer.id,
      points: 0,
      tier: 'bronze' as const,
      lifetimePoints: 0,
      lastUpdated: '',
    },
  })).sort((a, b) => b.loyalty.lifetimePoints - a.loyalty.lifetimePoints);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Gift className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">Loyalty Rewards Program</h2>
            <p className="text-purple-100">Earn {POINTS_PER_DOLLAR} points per dollar spent</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {Object.entries(TIER_BENEFITS).map(([tier, benefits]) => {
            const Icon = benefits.icon;
            return (
              <div key={tier} className="bg-white/10 rounded-lg p-3 backdrop-blur">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="font-semibold text-sm">{benefits.name}</span>
                </div>
                <div className="text-xs opacity-90">{benefits.discount}% off</div>
                <div className="text-xs opacity-75 mt-1">
                  {TIER_THRESHOLDS[tier as keyof typeof TIER_THRESHOLDS]}+ pts
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-800 mb-4">Add Points to Customer</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={selectedCustomer}
            onChange={e => setSelectedCustomer(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select customer...</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={pointsToAdd}
            onChange={e => setPointsToAdd(e.target.value)}
            placeholder="Points to add"
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddPoints}
            disabled={!selectedCustomer || !pointsToAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Points
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Customer Loyalty Status</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {customersWithLoyalty.map(customer => {
            const tierInfo = TIER_BENEFITS[customer.loyalty.tier];
            const TierIcon = tierInfo.icon;
            const pointsToNextTier =
              customer.loyalty.tier === 'platinum'
                ? 0
                : customer.loyalty.tier === 'gold'
                ? TIER_THRESHOLDS.platinum - customer.loyalty.lifetimePoints
                : customer.loyalty.tier === 'silver'
                ? TIER_THRESHOLDS.gold - customer.loyalty.lifetimePoints
                : TIER_THRESHOLDS.silver - customer.loyalty.lifetimePoints;

            return (
              <div key={customer.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-slate-800">{customer.name}</h4>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tierInfo.color}`}>
                        <TierIcon className="w-3 h-3" />
                        {tierInfo.name}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-slate-600">Current Points:</span>
                        <div className="font-semibold">{customer.loyalty.points}</div>
                      </div>
                      <div>
                        <span className="text-slate-600">Points Value:</span>
                        <div className="font-semibold text-green-600">${getPointsValue(customer.loyalty.points)}</div>
                      </div>
                      <div>
                        <span className="text-slate-600">Lifetime Points:</span>
                        <div className="font-semibold">{customer.loyalty.lifetimePoints}</div>
                      </div>
                      <div>
                        <span className="text-slate-600">Discount:</span>
                        <div className="font-semibold text-purple-600">{tierInfo.discount}%</div>
                      </div>
                    </div>
                    {pointsToNextTier > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-slate-600 mb-1">
                          {pointsToNextTier} points to next tier
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div
                            className="h-full bg-purple-600 rounded-full transition-all"
                            style={{
                              width: `${
                                ((customer.loyalty.lifetimePoints %
                                  (customer.loyalty.tier === 'gold'
                                    ? TIER_THRESHOLDS.platinum
                                    : customer.loyalty.tier === 'silver'
                                    ? TIER_THRESHOLDS.gold
                                    : TIER_THRESHOLDS.silver)) /
                                  (customer.loyalty.tier === 'gold'
                                    ? TIER_THRESHOLDS.platinum - TIER_THRESHOLDS.gold
                                    : customer.loyalty.tier === 'silver'
                                    ? TIER_THRESHOLDS.gold - TIER_THRESHOLDS.silver
                                    : TIER_THRESHOLDS.silver)) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {customer.loyalty.points >= 100 && (
                    <button
                      onClick={() => handleRedeemPoints(customer.id, 100)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      Redeem $1
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {customersWithLoyalty.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <Gift className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No customers enrolled yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
