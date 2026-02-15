import React, { useState, useEffect } from 'react';
import { Shield, Users, Key, Plus, Edit2, Save, X, Check, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { usePOS } from '../POSContext';
import type { Role, Permission, Cashier, RolePermission } from '../types';

export function RolePermissionManager() {
  const { isOwner } = usePOS();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedCashier, setSelectedCashier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', level: 3 });

  useEffect(() => {
    if (isOwner()) {
      loadData();
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [rolesRes, permsRes, rolePermsRes, cashiersRes] = await Promise.all([
        supabase.from('roles').select('*').order('level'),
        supabase.from('permissions').select('*').order('category, display_name'),
        supabase.from('role_permissions').select('*'),
        supabase.from('cashiers').select('*').order('name')
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (permsRes.error) throw permsRes.error;
      if (rolePermsRes.error) throw rolePermsRes.error;
      if (cashiersRes.error) throw cashiersRes.error;

      setRoles(rolesRes.data || []);
      setPermissions(permsRes.data || []);
      setRolePermissions(rolePermsRes.data || []);
      setCashiers(cashiersRes.data || []);

      if (rolesRes.data && rolesRes.data.length > 0) {
        setSelectedRole(rolesRes.data[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const createRole = async () => {
    if (!newRole.name.trim() || !newRole.description.trim()) {
      showMessage('error', 'Please fill in all fields');
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from('roles')
        .insert({
          name: newRole.name,
          description: newRole.description,
          level: newRole.level
        })
        .select()
        .single();

      if (error) throw error;

      setRoles(prev => [...prev, data].sort((a, b) => a.level - b.level));
      setSelectedRole(data.id);
      setShowCreateRoleModal(false);
      setNewRole({ name: '', description: '', level: 3 });
      showMessage('success', 'Role created successfully');
    } catch (error) {
      console.error('Error creating role:', error);
      showMessage('error', 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (roleId: string, roleName: string) => {
    if (roleName === 'Owner') {
      showMessage('error', 'Cannot delete the Owner role');
      return;
    }

    const usersWithRole = cashiers.filter(c => c.role_id === roleId);
    if (usersWithRole.length > 0) {
      showMessage('error', `Cannot delete role. ${usersWithRole.length} user(s) are assigned to this role.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the "${roleName}" role? This action cannot be undone.`)) {
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      setRoles(prev => prev.filter(r => r.id !== roleId));
      setRolePermissions(prev => prev.filter(rp => rp.role_id !== roleId));

      if (selectedRole === roleId) {
        setSelectedRole(roles[0]?.id || null);
      }

      showMessage('success', 'Role deleted successfully');
    } catch (error) {
      console.error('Error deleting role:', error);
      showMessage('error', 'Failed to delete role');
    } finally {
      setSaving(false);
    }
  };

  const getRolePermissions = (roleId: string): string[] => {
    return rolePermissions
      .filter(rp => rp.role_id === roleId)
      .map(rp => rp.permission_id);
  };

  const toggleRolePermission = async (roleId: string, permissionId: string) => {
    const hasPermission = rolePermissions.some(
      rp => rp.role_id === roleId && rp.permission_id === permissionId
    );

    try {
      setSaving(true);

      if (hasPermission) {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .match({ role_id: roleId, permission_id: permissionId });

        if (error) throw error;

        setRolePermissions(prev =>
          prev.filter(rp => !(rp.role_id === roleId && rp.permission_id === permissionId))
        );
      } else {
        const { data, error } = await supabase
          .from('role_permissions')
          .insert({ role_id: roleId, permission_id: permissionId })
          .select()
          .single();

        if (error) throw error;

        setRolePermissions(prev => [...prev, data]);
      }

      showMessage('success', 'Permission updated successfully');
    } catch (error) {
      console.error('Error toggling permission:', error);
      showMessage('error', 'Failed to update permission');
    } finally {
      setSaving(false);
    }
  };

  const updateCashierRole = async (cashierId: string, roleId: string) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('cashiers')
        .update({ role_id: roleId })
        .eq('id', cashierId);

      if (error) throw error;

      setCashiers(prev =>
        prev.map(c => c.id === cashierId ? { ...c, role_id: roleId } : c)
      );

      showMessage('success', 'User role updated successfully');
    } catch (error) {
      console.error('Error updating cashier role:', error);
      showMessage('error', 'Failed to update user role');
    } finally {
      setSaving(false);
    }
  };

  const toggleCustomPermission = async (cashierId: string, permissionName: string) => {
    const cashier = cashiers.find(c => c.id === cashierId);
    if (!cashier) return;

    const customPerms = cashier.custom_permissions || { granted: [], revoked: [] };
    const rolePerms = cashier.role_id ? getRolePermissions(cashier.role_id) : [];
    const permission = permissions.find(p => p.name === permissionName);
    if (!permission) return;

    const hasInRole = rolePerms.includes(permission.id);
    const isGranted = customPerms.granted.includes(permissionName);
    const isRevoked = customPerms.revoked.includes(permissionName);

    let newCustomPerms = { ...customPerms };

    if (hasInRole) {
      if (isRevoked) {
        newCustomPerms.revoked = customPerms.revoked.filter(p => p !== permissionName);
      } else {
        newCustomPerms.revoked = [...customPerms.revoked, permissionName];
      }
    } else {
      if (isGranted) {
        newCustomPerms.granted = customPerms.granted.filter(p => p !== permissionName);
      } else {
        newCustomPerms.granted = [...customPerms.granted, permissionName];
      }
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('cashiers')
        .update({ custom_permissions: newCustomPerms })
        .eq('id', cashierId);

      if (error) throw error;

      setCashiers(prev =>
        prev.map(c => c.id === cashierId ? { ...c, custom_permissions: newCustomPerms } : c)
      );

      showMessage('success', 'Custom permission updated successfully');
    } catch (error) {
      console.error('Error updating custom permission:', error);
      showMessage('error', 'Failed to update custom permission');
    } finally {
      setSaving(false);
    }
  };

  const getCashierPermissions = (cashier: Cashier): string[] => {
    const rolePerms = cashier.role_id ? getRolePermissions(cashier.role_id) : [];
    const rolePermNames = rolePerms
      .map(rpId => permissions.find(p => p.id === rpId)?.name)
      .filter(Boolean) as string[];

    const customPerms = cashier.custom_permissions || { granted: [], revoked: [] };

    let finalPerms = [...rolePermNames];
    if (customPerms.granted) {
      finalPerms.push(...customPerms.granted);
    }
    if (customPerms.revoked) {
      finalPerms = finalPerms.filter(p => !customPerms.revoked.includes(p));
    }

    return [...new Set(finalPerms)];
  };

  const getPermissionStatus = (cashier: Cashier, permissionName: string): 'role' | 'granted' | 'revoked' | 'none' => {
    const permission = permissions.find(p => p.name === permissionName);
    if (!permission) return 'none';

    const rolePerms = cashier.role_id ? getRolePermissions(cashier.role_id) : [];
    const hasInRole = rolePerms.includes(permission.id);

    const customPerms = cashier.custom_permissions || { granted: [], revoked: [] };
    const isGranted = customPerms.granted.includes(permissionName);
    const isRevoked = customPerms.revoked.includes(permissionName);

    if (hasInRole && isRevoked) return 'revoked';
    if (!hasInRole && isGranted) return 'granted';
    if (hasInRole && !isRevoked) return 'role';
    return 'none';
  };

  if (!isOwner()) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900">Access Denied</h3>
            <p className="text-yellow-700 text-sm mt-1">
              Only owners can manage roles and permissions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          Roles & Permissions
        </h2>
        <p className="text-slate-600 mt-1">Manage user roles and access permissions</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'roles'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Key className="w-4 h-4 inline mr-2" />
          Role Permissions
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'users'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          User Assignments
        </button>
      </div>

      {activeTab === 'roles' ? (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-700 text-sm uppercase">Roles</h3>
              <button
                onClick={() => setShowCreateRoleModal(true)}
                className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                title="Create New Role"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {roles.map(role => (
              <div key={role.id} className="relative group">
                <button
                  onClick={() => setSelectedRole(role.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedRole === role.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-medium pr-8">{role.name}</div>
                  <div
                    className={`text-sm ${
                      selectedRole === role.id ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {role.description}
                  </div>
                </button>
                {role.name !== 'Owner' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRole(role.id, role.name);
                    }}
                    disabled={saving}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="col-span-9 bg-white rounded-lg border border-slate-200 p-6">
            {selectedRole && (
              <div>
                <h3 className="font-semibold text-slate-800 mb-4">
                  {roles.find(r => r.id === selectedRole)?.name} Permissions
                </h3>

                <div className="space-y-6">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category}>
                      <h4 className="font-medium text-slate-700 mb-3 pb-2 border-b border-slate-200">
                        {category}
                      </h4>
                      <div className="space-y-2">
                        {perms.map(perm => {
                          const hasPermission = rolePermissions.some(
                            rp =>
                              rp.role_id === selectedRole &&
                              rp.permission_id === perm.id
                          );

                          return (
                            <label
                              key={perm.id}
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={hasPermission}
                                onChange={() =>
                                  toggleRolePermission(selectedRole, perm.id)
                                }
                                disabled={saving}
                                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <div>
                                <div className="font-medium text-slate-800">
                                  {perm.display_name}
                                </div>
                                <div className="text-sm text-slate-600">
                                  {perm.description}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-2">
            <h3 className="font-semibold text-slate-700 text-sm uppercase">Users</h3>
            {cashiers.map(cashier => (
              <button
                key={cashier.id}
                onClick={() => setSelectedCashier(cashier.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedCashier === cashier.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="font-medium">{cashier.name}</div>
                <div
                  className={`text-sm ${
                    selectedCashier === cashier.id ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  {cashier.cashier_id}
                </div>
                {cashier.role_id && (
                  <div
                    className={`text-xs mt-1 ${
                      selectedCashier === cashier.id ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {roles.find(r => r.id === cashier.role_id)?.name || 'No Role'}
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="col-span-9 bg-white rounded-lg border border-slate-200 p-6">
            {selectedCashier && (() => {
              const cashier = cashiers.find(c => c.id === selectedCashier);
              if (!cashier) return null;

              return (
                <div>
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-800 mb-1">{cashier.name}</h3>
                    <p className="text-sm text-slate-600 mb-4">{cashier.cashier_id}</p>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700 mb-2 block">
                        Assign Role
                      </span>
                      <select
                        value={cashier.role_id || ''}
                        onChange={e => updateCashierRole(cashier.id, e.target.value)}
                        disabled={saving}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">No Role</option>
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-800 mb-3">Custom Permissions</h4>
                    <p className="text-sm text-slate-600 mb-4">
                      Override role permissions for this user. Green = from role, Blue = granted, Red = revoked.
                    </p>

                    <div className="space-y-6">
                      {Object.entries(permissionsByCategory).map(([category, perms]) => (
                        <div key={category}>
                          <h5 className="font-medium text-slate-700 mb-3 pb-2 border-b border-slate-200">
                            {category}
                          </h5>
                          <div className="space-y-2">
                            {perms.map(perm => {
                              const status = getPermissionStatus(cashier, perm.name);

                              return (
                                <label
                                  key={perm.id}
                                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer ${
                                    status === 'role'
                                      ? 'bg-green-50 hover:bg-green-100'
                                      : status === 'granted'
                                      ? 'bg-blue-50 hover:bg-blue-100'
                                      : status === 'revoked'
                                      ? 'bg-red-50 hover:bg-red-100'
                                      : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={status === 'role' || status === 'granted'}
                                    onChange={() =>
                                      toggleCustomPermission(cashier.id, perm.name)
                                    }
                                    disabled={saving}
                                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-slate-800 flex items-center gap-2">
                                      {perm.display_name}
                                      {status === 'role' && (
                                        <span className="text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded">
                                          Role
                                        </span>
                                      )}
                                      {status === 'granted' && (
                                        <span className="text-xs px-2 py-0.5 bg-blue-200 text-blue-800 rounded">
                                          Custom
                                        </span>
                                      )}
                                      {status === 'revoked' && (
                                        <span className="text-xs px-2 py-0.5 bg-red-200 text-red-800 rounded">
                                          Revoked
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-slate-600">
                                      {perm.description}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {showCreateRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Create New Role</h3>
              <button
                onClick={() => {
                  setShowCreateRoleModal(false);
                  setNewRole({ name: '', description: '', level: 3 });
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={newRole.name}
                  onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="e.g., Store Manager"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={newRole.description}
                  onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Describe the role's responsibilities"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hierarchy Level
                </label>
                <select
                  value={newRole.level}
                  onChange={e => setNewRole({ ...newRole, level: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Level 1 - Owner (Full Access)</option>
                  <option value={2}>Level 2 - Manager</option>
                  <option value={3}>Level 3 - Employee</option>
                  <option value={4}>Level 4 - Limited Access</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Lower numbers = higher authority. Level 1 is the highest.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateRoleModal(false);
                    setNewRole({ name: '', description: '', level: 3 });
                  }}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={createRole}
                  disabled={!newRole.name.trim() || !newRole.description.trim() || saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
