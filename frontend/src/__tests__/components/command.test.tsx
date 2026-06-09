import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

// Mock cmdk primitives used by the component (Command has subcomponents attached)
vi.mock('cmdk', () => {
  const React = require('react')
  function Command(props: any) {
    return React.createElement('div', props, props.children)
  }
  Command.Input = (props: any) => React.createElement('input', props)
  Command.List = ({ children, ...props }: any) => React.createElement('div', props, children)
  Command.Empty = ({ children, ...props }: any) => React.createElement('div', props, children)
  Command.Group = ({ children, ...props }: any) => React.createElement('div', props, children)
  Command.Separator = (props: any) => React.createElement('div', props)
  Command.Item = ({ children, ...props }: any) => React.createElement('div', props, children)
  return { Command }
})

// Mock local Dialog primitives to avoid portal/DOM complexities
vi.mock('../../app/components/ui/dialog', () => {
  const React = require('react')
  return {
    Dialog: ({ children, ...props }: any) => React.createElement('div', props, children),
    DialogContent: ({ children, ...props }: any) => React.createElement('div', props, children),
    DialogDescription: ({ children, ...props }: any) => React.createElement('div', props, children),
    DialogHeader: ({ children, ...props }: any) => React.createElement('div', props, children),
    DialogTitle: ({ children, ...props }: any) => React.createElement('div', props, children),
  }
})

import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '../../app/components/ui/command'

describe('Command UI wrappers', () => {
  test('Command renders and forwards data-slot and className', () => {
    render(<Command className="my-cmd" data-slot="command" />)
    const el = document.querySelector('[data-slot="command"]')
    expect(el).toBeTruthy()
    expect(el).toHaveClass('my-cmd')
  })

  test('CommandInput renders wrapper and input with data-slot', () => {
    render(<CommandInput placeholder="Search" />)
    const wrapper = document.querySelector('[data-slot="command-input-wrapper"]')
    expect(wrapper).toBeTruthy()
    const input = document.querySelector('[data-slot="command-input"]')
    expect(input).toBeTruthy()
    expect((input as HTMLInputElement).getAttribute('placeholder')).toBe('Search')
  })

  test('CommandDialog renders title and description', () => {
    render(
      <CommandDialog open title="T" description="D">
        <div>child</div>
      </CommandDialog>
    )

    expect(screen.getByText('T')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
    expect(screen.getByText('child')).toBeInTheDocument()
  })

  test('CommandList, Item and Shortcut render and expose data-slots', () => {
    render(
      <CommandList>
        <CommandGroup>
          <CommandItem>Action<CommandShortcut>Ctrl+K</CommandShortcut></CommandItem>
        </CommandGroup>
        <CommandEmpty>No results</CommandEmpty>
        <CommandSeparator />
      </CommandList>
    )

    expect(document.querySelector('[data-slot="command-list"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="command-item"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="command-shortcut"]')).toBeTruthy()
    expect(screen.getByText('No results')).toBeInTheDocument()
  })
})
