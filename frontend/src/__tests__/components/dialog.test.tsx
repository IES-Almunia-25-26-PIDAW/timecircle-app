import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('lucide-react', () => ({ XIcon: () => React.createElement('svg', { 'data-icon': 'x' }) }))

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
} from '../../app/components/ui/dialog'

describe('Dialog UI wrapper', () => {
  test('opens content when trigger clicked and shows overlay', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>My title</DialogTitle>
          <DialogDescription>desc</DialogDescription>
          <div>Inner</div>
        </DialogContent>
      </Dialog>,
    )

    const trigger = screen.getByText('Open')
    fireEvent.click(trigger)

    // content should appear
    expect(await screen.findByText('Inner')).toBeTruthy()

    // overlay should be present
    expect(document.querySelector('[data-slot="dialog-overlay"]')).toBeTruthy()
  })

  test('close button renders XIcon and sr-only text', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogClose />
        </DialogContent>
      </Dialog>,
    )

    const trigger = screen.getByText('Open')
    fireEvent.click(trigger)

    // close button contains the sr-only Close text
    expect(await screen.findByText('Close')).toBeTruthy()
    // XIcon mock renders an svg with data-icon
    expect(document.querySelector('svg[data-icon="x"]')).toBeTruthy()
  })
})
