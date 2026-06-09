import React from 'react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@radix-ui/react-popover', () => {
  const React = require('react')
  const create = (name: string) => {
    return ({ children, ...props }: any) => React.createElement(name, { ...props }, children)
  }

  return {
    Root: create('div'),
    Trigger: create('button'),
    Portal: ({ children }: any) => React.createElement(React.Fragment, null, children),
    Content: create('div'),
    Anchor: create('div'),
  }
})

import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from '../../app/components/ui/popover'

describe('Popover UI', () => {
  test('renders Popover with trigger, content and anchor slots', () => {
    render(
      <Popover>
        <PopoverTrigger>open</PopoverTrigger>
        <PopoverContent className="extra">content</PopoverContent>
        <PopoverAnchor />
      </Popover>,
    )

    expect(document.querySelector('[data-slot="popover"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="popover-trigger"]')).toBeTruthy()
    const content = document.querySelector('[data-slot="popover-content"]') as HTMLElement
    expect(content).toBeTruthy()
    expect(content.className).toContain('extra')
    expect(document.querySelector('[data-slot="popover-anchor"]')).toBeTruthy()
  })

  test('PopoverContent receives align and sideOffset props', () => {
    render(<PopoverContent align="start" sideOffset={12} />)
    const content = document.querySelector('[data-slot="popover-content"]') as HTMLElement
    expect(content.getAttribute('align')).toBe('start')
    expect(content.getAttribute('sideoffset') || content.getAttribute('sideOffset')).toBeDefined()
  })
})
