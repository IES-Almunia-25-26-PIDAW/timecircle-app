import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@radix-ui/react-hover-card', () => {
  const React = require('react')
  const Root = (props: any) => React.createElement('div', props)
  const Trigger = (props: any) => React.createElement('a', { 'data-slot': 'hover-card-trigger', 'data-state': 'closed', ...props })
  const Portal = (props: any) => React.createElement(React.Fragment, null, props.children)
  const Content = (props: any) => React.createElement('div', { 'data-slot': 'hover-card-content', ...props })
  return { Root, Trigger, Portal, Content }
})

import { HoverCard, HoverCardTrigger, HoverCardContent } from '../../app/components/ui/hover-card'

describe('HoverCard UI wrapper', () => {
  test('shows content on hover and renders portal', async () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Hover me</HoverCardTrigger>
        <HoverCardContent>
          <div>Card content</div>
        </HoverCardContent>
      </HoverCard>,
    )

    const trigger = screen.getByText('Hover me')
    fireEvent.mouseEnter(trigger)

    expect(await screen.findByText('Card content')).toBeTruthy()
    expect(document.querySelector('[data-slot="hover-card-content"]')).toBeTruthy()
  })
})
