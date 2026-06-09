import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

// Mock the vaul Drawer primitive used by the component
vi.mock('vaul', () => {
  const R: any = (props: any) => React.createElement('div', props)
  R.Root = (props: any) => React.createElement('div', props)
  R.Trigger = (props: any) => React.createElement('button', props)
  R.Portal = (props: any) => React.createElement(React.Fragment, null, props.children)
  R.Close = (props: any) => React.createElement('button', props)
  R.Overlay = (props: any) => React.createElement('div', { 'data-slot': 'drawer-overlay', ...props })
  R.Content = (props: any) => React.createElement('div', props)
  R.Title = (props: any) => React.createElement('div', props)
  R.Description = (props: any) => React.createElement('div', props)
  return { Drawer: R }
})

import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerClose,
  DrawerOverlay,
  DrawerTitle,
  DrawerDescription,
} from '../../app/components/ui/drawer'

describe('Drawer UI wrapper', () => {
  test('opens content when trigger clicked and shows overlay', async () => {
    render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>My title</DrawerTitle>
          <DrawerDescription>desc</DrawerDescription>
          <div>Inner drawer</div>
        </DrawerContent>
      </Drawer>,
    )

    const trigger = screen.getByText('Open')
    fireEvent.click(trigger)

    expect(await screen.findByText('Inner drawer')).toBeTruthy()
    expect(document.querySelector('[data-slot="drawer-overlay"]')).toBeTruthy()
  })

  test('close button renders and contains expected label when used', async () => {
    render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent>
          <DrawerClose>Close me</DrawerClose>
        </DrawerContent>
      </Drawer>,
    )

    const trigger = screen.getByText('Open')
    fireEvent.click(trigger)

    expect(await screen.findByText('Close me')).toBeTruthy()
  })
})
