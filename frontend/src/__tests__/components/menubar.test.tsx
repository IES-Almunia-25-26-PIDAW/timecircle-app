import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

// Mock Radix menubar primitives
vi.mock('@radix-ui/react-menubar', () => {
  const React = require('react')
  const make = (name: string) => (props: any) => React.createElement(name, props, props.children)
  return {
    Root: make('div'),
    Menu: make('div'),
    Group: make('div'),
    Portal: make('div'),
    RadioGroup: make('div'),
    Trigger: make('button'),
    Content: make('div'),
    Item: make('div'),
    CheckboxItem: make('div'),
    RadioItem: make('div'),
    Label: make('div'),
    Separator: make('div'),
    Sub: make('div'),
    SubTrigger: make('button'),
    SubContent: make('div'),
    ItemIndicator: ({ children }: any) => React.createElement('span', { 'data-indicator': true }, children),
  }
})

// Mock lucide icons used
vi.mock('lucide-react', () => ({ CheckIcon: () => React.createElement('svg', { 'data-icon': 'check' }), CircleIcon: () => React.createElement('svg', { 'data-icon': 'circle' }), ChevronRightIcon: () => React.createElement('svg', { 'data-icon': 'chev' }) }))

describe('Menubar wrapper', () => {
  test('renders menubar, items, checkbox and radio', async () => {
    const mod = await import('../../app/components/ui/menubar')
    const {
      Menubar,
      MenubarMenu,
      MenubarTrigger,
      MenubarContent,
      MenubarItem,
      MenubarCheckboxItem,
      MenubarRadioItem,
      MenubarLabel,
      MenubarSeparator,
      MenubarSub,
      MenubarSubTrigger,
      MenubarSubContent,
    } = mod

    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Open</MenubarTrigger>
          <MenubarContent>
            <MenubarLabel inset>Label</MenubarLabel>
            <MenubarItem>Simple</MenubarItem>
            <MenubarCheckboxItem checked>Check</MenubarCheckboxItem>
            <MenubarRadioItem>Radio</MenubarRadioItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger inset>Sub</MenubarSubTrigger>
              <MenubarSubContent>SubContent</MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    )

    expect(document.querySelector('[data-slot="menubar"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="menubar-content"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="menubar-item"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="menubar-checkbox-item"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="menubar-radio-item"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="menubar-sub-trigger"]')).toBeTruthy()
  })
})
