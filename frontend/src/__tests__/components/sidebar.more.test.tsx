import React from 'react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

const useMobilePath = '../../app/components/ui/use-mobile'
const tooltipPath = '../../app/components/ui/tooltip'

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  document.cookie = 'sidebar_state=; max-age=0; path=/'
})

test('renders desktop floating sidebar with icon collapse and right side', async () => {
  vi.doMock(useMobilePath, () => ({ useIsMobile: () => false }))
  // mock tooltip to avoid Radix internals
  vi.doMock(tooltipPath, () => {
    const React = require('react')
    return {
      TooltipProvider: ({ children }: any) => React.createElement('div', {}, children),
      Tooltip: ({ children }: any) => React.createElement('div', {}, children),
      TooltipTrigger: ({ children, ...p }: any) => React.createElement('div', p, children),
      TooltipContent: ({ children, hidden }: any) => React.createElement('div', { 'data-hidden': hidden }, children),
    }
  })

  const mod = await import('../../app/components/ui/sidebar')
  const {
    SidebarProvider,
    Sidebar,
    SidebarRail,
    SidebarInput,
    SidebarHeader,
    SidebarFooter,
    SidebarSeparator,
    SidebarContent,
    SidebarGroupLabel,
    SidebarGroupAction,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuAction,
    SidebarMenuBadge,
    SidebarMenuSkeleton,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
  } = mod

  render(
    <SidebarProvider defaultOpen={true}>
      <Sidebar side="right" variant="floating" collapsible="icon">
        <SidebarRail />
        <SidebarContent>
          <SidebarHeader>Header</SidebarHeader>
          <SidebarGroupLabel asChild>
            <div>LabelChild</div>
          </SidebarGroupLabel>
          <SidebarGroupAction asChild>
            <button>Act</button>
          </SidebarGroupAction>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={<div>HTML Tip</div>} isActive>
                Item
              </SidebarMenuButton>
              <SidebarMenuBadge>3</SidebarMenuBadge>
              <SidebarMenuAction showOnHover />
            </SidebarMenuItem>
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton size="sm" isActive href="#">Sub</SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </SidebarMenu>

          <SidebarSeparator />
          <SidebarInput placeholder="search" />
          <SidebarFooter>Footer</SidebarFooter>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>,
  )

  // assert some slots present
  expect(document.querySelector('[data-slot="sidebar"]')).toBeTruthy()
  expect(document.querySelector('[data-slot="sidebar-rail"]')).toBeTruthy()
  expect(document.querySelector('[data-slot="sidebar-menu-button"]')).toBeTruthy()
  expect(document.querySelector('[data-sidebar="menu-skeleton-icon"]')).toBeTruthy()
  expect(document.querySelector('[data-slot="sidebar-menu-sub-button"]')).toBeTruthy()
})
