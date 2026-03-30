import { useSyncExternalStore, useEffect } from 'react';
import { supabase } from './supabase';

export type UserRole = 'patient' | 'doctor' | 'pharmacist' | 'lab' | 'radiology';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

let currentUser: User | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

// Initialize from Supabase session
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    // Attempt to map Supabase user to our internal User structure
    // Role would typically come from a 'profiles' table in Supabase
    currentUser = {
      id: session.user.id,
      name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
      email: session.user.email || '',
      role: (session.user.user_metadata?.role as UserRole) || 'patient'
    };
  } else {
    currentUser = null;
    localStorage.removeItem('mediflow_user');
  }
  notify();
});

export function login(user: User) {
  // This is still a helper for the UI, but real auth happens via supabase.auth
  currentUser = user;
  localStorage.setItem('mediflow_user', JSON.stringify(user));
  notify();
}

export function logout() {
  supabase.auth.signOut();
  currentUser = null;
  localStorage.removeItem('mediflow_user');
  notify();
}

export function getUser(): User | null {
  if (!currentUser) {
    const stored = localStorage.getItem('mediflow_user');
    if (stored) {
      try { currentUser = JSON.parse(stored); } catch { /* ignore */ }
    }
  }
  return currentUser;
}

function sub(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useAuth() {
  const user = useSyncExternalStore(sub, getUser, () => null);
  
  // Also ensure we sync with Supabase on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !currentUser) {
        currentUser = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          role: (session.user.user_metadata?.role as UserRole) || 'patient'
        };
        notify();
      }
    });
  }, []);

  return { user, login, logout, isAuthenticated: !!user, supabase };
}
