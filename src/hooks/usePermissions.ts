import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { LoggedInCashier, Permission, Role } from '../types';

export function usePermissions(cashier: LoggedInCashier | null) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cashier) {
      setPermissions([]);
      setRole(null);
      setLoading(false);
      return;
    }

    loadPermissions();
  }, [cashier?.id, cashier?.role_id]);

  const loadPermissions = async () => {
    if (!cashier) return;

    try {
      setLoading(true);

      if (!cashier.role_id) {
        setPermissions([]);
        setRole(null);
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', cashier.role_id)
        .maybeSingle();

      if (roleError) throw roleError;

      if (roleData) {
        setRole(roleData);

        const { data: rolePerms, error: permsError } = await supabase
          .from('role_permissions')
          .select(`
            permission_id,
            permissions (
              name
            )
          `)
          .eq('role_id', cashier.role_id);

        if (permsError) throw permsError;

        const permissionNames = rolePerms
          ?.map((rp: any) => rp.permissions?.name)
          .filter(Boolean) || [];

        const { data: cashierData, error: cashierError } = await supabase
          .from('cashiers')
          .select('custom_permissions')
          .eq('id', cashier.id)
          .maybeSingle();

        if (cashierError) throw cashierError;

        let finalPermissions = [...permissionNames];

        if (cashierData?.custom_permissions) {
          const custom = cashierData.custom_permissions as { granted: string[], revoked: string[] };

          if (custom.granted) {
            finalPermissions.push(...custom.granted);
          }

          if (custom.revoked) {
            finalPermissions = finalPermissions.filter(p => !custom.revoked.includes(p));
          }
        }

        setPermissions([...new Set(finalPermissions)]);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every(p => permissions.includes(p));
  };

  const isOwner = (): boolean => {
    return role?.level === 1;
  };

  const isManager = (): boolean => {
    return role?.level === 2;
  };

  return {
    permissions,
    role,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isOwner,
    isManager,
    reload: loadPermissions
  };
}
