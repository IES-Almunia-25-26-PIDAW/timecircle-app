import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

const useMobilePath = '../../app/components/ui/use-mobile'
const tooltipPath = '../../app/components/ui/tooltip'

describe('Sidebar targeted branches', () => {
  afterEach(() => {
    vi.resetModules()
    document.cookie = 'sidebar_state=; max-age=0; path=/'
  })

  test('calls onOpenChange when provided', async () => {
    // mock non-mobile
    vi.doMock(useMobilePath, () => ({ useIsMobile: () => false }))

    const { SidebarProvider, useSidebar } = await import(
      '../../app/components/ui/sidebar',
    )

    const mockOnOpenChange = vi.fn()

    function Caller() {
      const ctx = useSidebar()
      React.useEffect(() => {
        ctx.setOpen(false)
      }, [])
      return <div data-testid="open">{String(ctx.open)}</div>
    }

    render(
      <SidebarProvider onOpenChange={mockOnOpenChange} open={true}>
        <Caller />
      </SidebarProvider>,
    )

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  test('keyboard shortcut toggles desktop open state', async () => {
    vi.doMock(useMobilePath, () => ({ useIsMobile: () => false }))

    const { SidebarProvider, useSidebar } = await import(
      '../../app/components/ui/sidebar',
    )

    function Show() {
      const s = useSidebar()
      return <div data-testid="val">{String(s.open)}</div>
    }

    render(
      <SidebarProvider defaultOpen={true}>
        <Show />
      </SidebarProvider>,
    )

    expect(screen.getByTestId('val').textContent).toBe('true')

    // dispatch ctrl+b
    fireEvent.keyDown(globalThis, { key: 'b', ctrlKey: true })

    expect(screen.getByTestId('val').textContent).toBe('false')
  })

  test('keyboard shortcut toggles mobile openMobile state', async () => {
    vi.doMock(useMobilePath, () => ({ useIsMobile: () => true }))

    const { SidebarProvider, useSidebar } = await import(
      '../../app/components/ui/sidebar',
    )

    function Show() {
      const s = useSidebar()
      return <div data-testid="valmobile">{String(s.openMobile)}</div>
    }

    render(
      <SidebarProvider>
        <Show />
      </SidebarProvider>,
    )

    expect(screen.getByTestId('valmobile').textContent).toBe('false')
    fireEvent.keyDown(globalThis, { key: 'b', ctrlKey: true })
    expect(screen.getByTestId('valmobile').textContent).toBe('true')
  })

  test('Tooltip hidden logic for collapsed vs mobile', async () => {
    // mock tooltip primitives to expose hidden prop
    vi.doMock(tooltipPath, () => {
      const React = require('react')
      return {
        TooltipProvider: ({ children }: any) => React.createElement('div', {}, children),
        Tooltip: ({ children }: any) => React.createElement('div', {}, children),
        TooltipTrigger: ({ children, ...p }: any) => React.createElement('div', p, children),
        TooltipContent: ({ children, hidden }: any) => React.createElement('div', { 'data-hidden': hidden }, children),
      }
    })

    vi.doMock(useMobilePath, () => ({ useIsMobile: () => false }))
    const mod = await import('../../app/components/ui/sidebar')
    const { SidebarProvider, SidebarMenuButton } = mod

    render(
      <SidebarProvider defaultOpen={false}>
        <SidebarMenuButton tooltip="Tip">T</SidebarMenuButton>
      </SidebarProvider>,
    )

    // TooltipContent should be rendered with data-hidden === false
    const content = document.querySelector('[data-hidden]')
    expect(content).toBeTruthy()
    expect(content?.getAttribute('data-hidden')).toBe('false')

    // mobile case -> hidden true
    vi.resetModules()
    vi.doMock(tooltipPath, () => {
      const React = require('react')
      return {
        TooltipProvider: ({ children }: any) => React.createElement('div', {}, children),
        Tooltip: ({ children }: any) => React.createElement('div', {}, children),
        TooltipTrigger: ({ children, ...p }: any) => React.createElement('div', p, children),
        TooltipContent: ({ children, hidden }: any) => React.createElement('div', { 'data-hidden': hidden }, children),
      }
    })
    vi.doMock(useMobilePath, () => ({ useIsMobile: () => true }))
    const mod2 = await import('../../app/components/ui/sidebar')
    const { SidebarProvider: SP2, SidebarMenuButton: SMB2 } = mod2

    render(
      <SP2 defaultOpen={false}>
        <SMB2 tooltip="Tip">T</SMB2>
      </SP2>,
    )

    const content2 = document.querySelectorAll('[data-hidden]')[1]
    expect(content2).toBeTruthy()
    expect(content2?.getAttribute('data-hidden')).toBe('true')
  })

  test('SidebarMenuSkeleton renders icon and text width', async () => {
    vi.doMock(useMobilePath, () => ({ useIsMobile: () => false }))
    const { SidebarMenuSkeleton } = await import('../../app/components/ui/sidebar')

    render(<SidebarMenuSkeleton showIcon />)
    expect(document.querySelector('[data-sidebar="menu-skeleton-icon"]')).toBeTruthy()
    expect(document.querySelector('[data-sidebar="menu-skeleton-text"]')).toBeTruthy()
  })

  test('SidebarTrigger onClick calls provided handler and toggles', async () => {
    vi.doMock(useMobilePath, () => ({ useIsMobile: () => false }))
    const mod = await import('../../app/components/ui/sidebar')
    const { SidebarProvider, SidebarTrigger, useSidebar } = mod

    const handler = vi.fn()

    function Show() {
      const s = useSidebar()
      return <div data-testid="openstate">{String(s.open)}</div>
    }

    render(
      <SidebarProvider defaultOpen={true}>
        <SidebarTrigger onClick={handler} />
        <Show />
      </SidebarProvider>,
    )

    const btn = document.querySelector('[data-slot="sidebar-trigger"]') as HTMLElement
    expect(btn).toBeTruthy()
    fireEvent.click(btn)
    expect(handler).toHaveBeenCalled()
    expect(screen.getByTestId('openstate').textContent).toBe('false')
  })
})
