import React from 'react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@radix-ui/react-progress', () => {
  const React = require('react')
  const Root = ({ children, ...props }: any) => React.createElement('div', props, children)
  const Indicator = ({ children, ...props }: any) => React.createElement('div', props, children)
  return { Root, Indicator }
})

import { Progress } from '../../app/components/ui/progress'

describe('Progress UI', () => {
  test('renders progress root and indicator with className', () => {
    render(<Progress value={42} className="extra-class" />)

    const root = document.querySelector('[data-slot="progress"]') as HTMLElement
    expect(root).toBeTruthy()
    expect(root.className).toContain('extra-class')

    const indicator = document.querySelector('[data-slot="progress-indicator"]') as HTMLElement
    expect(indicator).toBeTruthy()
    expect(indicator.style.transform).toBe('translateX(-58%)')
  })

  test('indicator uses 0 when no value provided', () => {
    render(<Progress />)
    const indicator = document.querySelector('[data-slot="progress-indicator"]') as HTMLElement
    expect(indicator.style.transform).toBe('translateX(-100%)')
  })
})
