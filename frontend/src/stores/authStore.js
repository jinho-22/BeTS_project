import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      mustChangePassword: false,
      _hasHydrated: false,

      login: (user, mustChangePassword = false) =>
        set({
          user,
          isAuthenticated: true,
          mustChangePassword,
        }),

      clearMustChangePassword: () =>
        set({ mustChangePassword: false }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          mustChangePassword: false,
        }),

      updateUser: (userData) =>
        set((state) => ({
          user: { ...state.user, ...userData },
        })),
    }),
    {
      name: 'bets-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// store 생성 완료 후 hydration 완료 감지 등록 (temporal dead zone 회피)
useAuthStore.persist.onFinishHydration(() => {
  useAuthStore.setState({ _hasHydrated: true });
});

// 이미 hydration이 동기적으로 완료된 경우 처리
if (useAuthStore.persist.hasHydrated()) {
  useAuthStore.setState({ _hasHydrated: true });
}
