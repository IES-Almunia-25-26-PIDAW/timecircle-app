import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

const useMobilePath = '../../app/components/ui/use-mobile'
const tooltipPath = '../../app/components/ui/tooltip'

afterEach(() => {
  vi.resetModules()
  document.cookie = 'sidebar_state=; max-age=0; path=/'
})

test('unmount cleans up keyboard listener', async () => {
  vi.doMock(useMobilePath, () => ({ useIsMobile: () => false }))
  const removeSpy = vi.spyOn(globalThis, 'removeEventListener')
  const { SidebarProvider } = await import('../../app/components/ui/sidebar')

  const { unmount } = render(
    <SidebarProvider>
      <div />
    </SidebarProvider>,
  )

  unmount()
  expect(removeSpy).toHaveBeenCalled()
  removeSpy.mockRestore()
})

test('renders offcanvas and inset variants and none collapsible', async () => {
  vi.doMock(useMobilePath, () => ({ useIsMobile: () => false }))
  const mod = await import('../../app/components/ui/sidebar')
  const { SidebarProvider, Sidebar } = mod

  render(
    <SidebarProvider>
      <Sidebar collapsible="offcanvas" variant="inset">Off</Sidebar>
      <Sidebar collapsible="none">None</Sidebar>
      <Sidebar collapsible="icon">Icon</Sidebar>
    </SidebarProvider>,
  )

  expect(document.querySelectorAll('[data-slot="sidebar"]').length).toBeGreaterThan(0)
})

test('rail click toggles sidebar state', async () => {
  vi.doMock(useMobilePath, () => ({ useIsMobile: () => false }))
  const mod = await import('../../app/components/ui/sidebar')
  const { SidebarProvider, SidebarRail, useSidebar } = mod

  function Show() {
    const s = useSidebar()
    return <div data-testid="open">{String(s.open)}</div>
  }

  render(
    <SidebarProvider defaultOpen={true}>
      <SidebarRail />
      <Show />
    </SidebarProvider>,
  )

  const rail = document.querySelector('[data-slot="sidebar-rail"]') as HTMLElement
  expect(rail).toBeTruthy()
  fireEvent.click(rail)
  expect(screen.getByTestId('open').textContent).toBe('false')
})

test('tooltip prop object spreads side and align', async () => {
  vi.doMock(tooltipPath, () => {
    const React = require('react')
    return {
      TooltipProvider: ({ children }: any) => React.createElement('div', {}, children),
      Tooltip: ({ children }: any) => React.createElement('div', {}, children),
      TooltipTrigger: ({ children, ...p }: any) => React.createElement('div', p, children),
      TooltipContent: ({ children, hidden, side, align }: any) =>
        React.createElement('div', { 'data-hidden': hidden, 'data-side': side, 'data-align': align }, children),
    }
  })

  vi.doMock(useMobilePath, () => ({ useIsMobile: () => false }))
  const mod = await import('../../app/components/ui/sidebar')
  const { SidebarProvider, SidebarMenuButton } = mod

  render(
    <SidebarProvider defaultOpen={false}>
      <SidebarMenuButton tooltip={{ children: 'X', side: 'left', align: 'start' }}>B</SidebarMenuButton>
    </SidebarProvider>,
  )

  const el = document.querySelector('[data-side="left"]')
  expect(el).toBeTruthy()
  expect(el?.getAttribute('data-align')).toBe('start')
})
