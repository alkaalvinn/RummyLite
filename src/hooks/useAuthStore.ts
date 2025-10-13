import { create } from 'zustand';
import { auth, signInWithGoogle, signInWithEmail, signUpWithEmail, logoutUser } from '../services/firebase';
import { User as FirebaseUser } from 'firebase/auth';

interface AuthState {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  initializeAuth: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  let unsubscribe: (() => void) | null = null;

  return {
    user: null,
    loading: true,
    error: null,

    initializeAuth: () => {
      if (unsubscribe) {
        unsubscribe();
      }

      set({ loading: true });

      try {
        unsubscribe = auth.onAuthStateChanged((user) => {
          console.log('Auth state changed:', user?.email || 'null');
          set({ user, loading: false, error: null });
        }, (error) => {
          console.error('Auth error:', error);
          set({ error: error.message, loading: false });
        });
      } catch (error) {
        console.error('Auth initialization error:', error);
        set({ error: 'Failed to initialize authentication', loading: false });
      }

      return unsubscribe;
    },

  signInWithGoogle: async () => {
    try {
      set({ loading: true, error: null });
      const user = await signInWithGoogle();
      set({ user, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  signInWithEmail: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const user = await signInWithEmail(email, password);
      set({ user, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const user = await signUpWithEmail(email, password);
      set({ user, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  logout: async () => {
    try {
      set({ loading: true, error: null });
      await logoutUser();
      set({ user: null, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
  };
});