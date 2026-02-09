import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      login: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),

      setAccessToken: (accessToken) =>
        set({ accessToken }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
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
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
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
