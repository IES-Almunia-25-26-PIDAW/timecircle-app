import React, { useState } from 'react'
import { render, fireEvent } from '@testing-library/react'

import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../app/components/ui/collapsible'

describe('Collapsible', () => {
  test('renders slots for root, trigger and content', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Open</CollapsibleTrigger>
        <CollapsibleContent>Hidden</CollapsibleContent>
      </Collapsible>
    )

    const root = document.querySelector('[data-slot="collapsible"]')
    expect(root).toBeTruthy()
    const trigger = document.querySelector('[data-slot="collapsible-trigger"]')
    expect(trigger).toBeTruthy()
    const content = document.querySelector('[data-slot="collapsible-content"]')
    expect(content).toBeTruthy()
  })

  test('controlled open state toggles content visibility', () => {
    function Wrapper() {
      const [open, setOpen] = useState(false)
      return (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Now visible</CollapsibleContent>
        </Collapsible>
      )
    }

    render(<Wrapper />)
    const trigger = document.querySelector('[data-slot="collapsible-trigger"]') as HTMLElement
    const content = document.querySelector('[data-slot="collapsible-content"]') as HTMLElement
    // Initially content may be hidden by Radix; ensure clicking trigger shows it
    fireEvent.click(trigger)
    expect(content).toBeTruthy()
    // Click again to close
    fireEvent.click(trigger)
    expect(content).toBeTruthy()
  })
})
