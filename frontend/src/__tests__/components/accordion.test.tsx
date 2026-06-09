import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

// Mock @radix-ui/react-accordion with a lightweight, test-friendly implementation
vi.mock('@radix-ui/react-accordion', () => {
  const React = require('react')
  const Ctx = React.createContext<any>(null)

  function Root({ children, ...props }: any) {
    return <div data-radix-root {...props}>{children}</div>
  }

  function Item({ children, ...props }: any) {
    const [open, setOpen] = React.useState(false)
    return (
      <div data-radix-item data-open={open} {...props}>
        <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>
      </div>
    )
  }

  function Header({ children, ...props }: any) {
    return <div data-radix-header {...props}>{children}</div>
  }

  function Trigger({ children, ...props }: any) {
    const ctx = React.useContext(Ctx)
    return (
      <button data-radix-trigger onClick={() => ctx.setOpen(!ctx.open)} {...props}>
        {children}
      </button>
    )
  }

  function Content({ children, ...props }: any) {
    const ctx = React.useContext(Ctx)
    return ctx.open ? <div data-radix-content {...props}>{children}</div> : null
  }

  return { __esModule: true, Root, Item, Header, Trigger, Content }
})

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../app/components/ui/accordion'

describe('Accordion UI', () => {
  it('renders trigger and content and toggles on click', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="i1">
          <AccordionTrigger>Title</AccordionTrigger>
          <AccordionContent>Body content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    // Trigger is present
    const trigger = screen.getByText('Title')
    expect(trigger).toBeInTheDocument()

    // Content is not visible initially
    expect(screen.queryByText('Body content')).toBeNull()

    // Click to open
    fireEvent.click(trigger)
    expect(screen.getByText('Body content')).toBeInTheDocument()

    // Click again to close
    fireEvent.click(trigger)
    expect(screen.queryByText('Body content')).toBeNull()
  })

  it('preserves data-slot and custom className props', () => {
    render(
      <Accordion className="root-class">
        <AccordionItem className="item-class">
          <AccordionTrigger className="trigger-class">T</AccordionTrigger>
          <AccordionContent className="content-class">C</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    // root has our custom class
    expect(document.querySelector('[data-radix-root]')?.className).toContain('root-class')
    expect(document.querySelector('[data-radix-item]')?.className).toContain('item-class')
    expect(document.querySelector('[data-radix-trigger]')?.className).toContain('trigger-class')
  })
})
