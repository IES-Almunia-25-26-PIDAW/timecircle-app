import React from 'react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

// Mock radix context-menu primitives
vi.mock('@radix-ui/react-context-menu', () => {
  const React = require('react')
  const make = (name: string) => (props: any) => React.createElement(name, props, props.children)
  return {
    Root: make('div'),
    Trigger: make('button'),
    Group: make('div'),
    Portal: make('div'),
    Sub: make('div'),
    RadioGroup: make('div'),
    SubTrigger: make('div'),
    SubContent: make('div'),
    Content: make('div'),
    Item: make('div'),
    CheckboxItem: make('div'),
    RadioItem: make('div'),
    Label: make('div'),
    Separator: make('div'),
    ItemIndicator: (props: any) => React.createElement('span', props, props.children),
  }
})

// Mock lucide icons
vi.mock('lucide-react', () => {
  const React = require('react')
  return {
    CheckIcon: (props: any) => React.createElement('svg', props),
    ChevronRightIcon: (props: any) => React.createElement('svg', props),
    CircleIcon: (props: any) => React.createElement('svg', props),
  }
})

import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from '../../app/components/ui/context-menu'

describe('ContextMenu wrappers', () => {
  test('renders root, trigger and content with data-slot attributes', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Open</ContextMenuTrigger>
        <ContextMenuContent>Menu</ContextMenuContent>
      </ContextMenu>
    )

    expect(document.querySelector('[data-slot="context-menu"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="context-menu-trigger"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy()
  })

  test('ContextMenuItem forwards variant and inset attributes', () => {
    render(<ContextMenuItem variant="destructive" inset>Delete</ContextMenuItem>)
    const item = document.querySelector('[data-slot="context-menu-item"]')
    expect(item).toBeTruthy()
    expect(item).toHaveAttribute('data-variant', 'destructive')
    expect(item).toHaveAttribute('data-inset')
  })

  test('Checkbox and Radio items render item indicators', () => {
    render(
      <div>
        <ContextMenuCheckboxItem checked>Check</ContextMenuCheckboxItem>
        <ContextMenuRadioItem>Radio</ContextMenuRadioItem>
      </div>
    )

    const checkbox = document.querySelector('[data-slot="context-menu-checkbox-item"]')
    const radio = document.querySelector('[data-slot="context-menu-radio-item"]')
    expect(checkbox).toBeTruthy()
    expect(radio).toBeTruthy()
    // indicators are rendered as children (svg)
    expect(checkbox?.querySelector('svg')).toBeTruthy()
    expect(radio?.querySelector('svg')).toBeTruthy()
  })

  test('Label, Separator and Shortcut render with slots', () => {
    render(
      <div>
        <ContextMenuLabel inset>Label</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuShortcut>Ctrl+K</ContextMenuShortcut>
      </div>
    )

    expect(document.querySelector('[data-slot="context-menu-label"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="context-menu-separator"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="context-menu-shortcut"]')).toBeTruthy()
  })
})
