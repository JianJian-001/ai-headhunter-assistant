import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LayoutState {
  sidebarCollapsed: boolean
  profile: {
    name: string
    avatarDataUrl: string | null
  }
  toggleSidebar: () => void
  updateProfile: (updates: Partial<LayoutState['profile']>) => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      profile: {
        name: '猎头顾问',
        avatarDataUrl: null,
      },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      updateProfile: (updates) =>
        set((state) => ({
          profile: {
            ...state.profile,
            ...updates,
          },
        })),
    }),
    {
      name: 'domi-layout',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
)
