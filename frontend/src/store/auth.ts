import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginRequest, RegisterRequest } from '@/types';
import { authService } from '@/services/auth';
import { toast } from 'react-hot-toast';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (data: LoginRequest) => {
        try {
          set({ isLoading: true });
          
          const tokens = await authService.login(data);

          localStorage.setItem('access_token', tokens.access);
          localStorage.setItem('refresh_token', tokens.refresh);

          await get().fetchUser();
          
          toast.success('Login realizado com sucesso!');
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data: RegisterRequest) => {
        try {
          set({ isLoading: true });
          
          await authService.register(data);
          
          toast.success('Enviamos um e-mail de confirmação para confirmar sua conta!');
        } catch (error) {
          console.error('Register error:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        set({ 
          user: null, 
          isAuthenticated: false 
        });
        
        toast.success('Logout realizado com sucesso!');
      },

      fetchUser: async () => {
        try {
          const token = localStorage.getItem('access_token');
          if (!token) return;

          set({ isLoading: true });
          
          const user = await authService.getMe();
          
          set({ 
            user, 
            isAuthenticated: true 
          });
        } catch (error) {
          console.error('Fetch user error:', error);
          get().logout();
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);