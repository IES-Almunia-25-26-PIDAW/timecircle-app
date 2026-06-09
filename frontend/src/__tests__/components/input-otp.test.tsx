import React from 'react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('lucide-react', () => ({ MinusIcon: () => React.createElement('svg', { 'data-icon': 'minus' }) }))

vi.mock('input-otp', () => {
  const React = require('react')
  const OTPInput = (props: any) => React.createElement('div', { 'data-slot': 'input-otp', ...props }, props.children)
  const OTPInputContext = React.createContext(null)
  return { OTPInput, OTPInputContext }
})

import { InputOTP, InputOTPSlot, InputOTPSeparator, InputOTPGroup } from '../../app/components/ui/input-otp'

describe('InputOTP wrappers', () => {
  test('InputOTP renders container', () => {
    render(<InputOTP />)
    expect(document.querySelector('[data-slot="input-otp"]')).toBeTruthy()
  })

  test('InputOTPSlot renders slot element', () => {
    render(<InputOTPSlot index={0} />)
    const slot = document.querySelector('[data-slot="input-otp-slot"]')
    expect(slot).toBeTruthy()
  })

  test('InputOTPSeparator renders MinusIcon', () => {
    render(<InputOTPSeparator />)
    expect(document.querySelector('svg[data-icon="minus"]')).toBeTruthy()
  })

  test('InputOTPGroup applies container class', () => {
    render(<InputOTPGroup className="mygrp">child</InputOTPGroup>)
    const grp = document.querySelector('[data-slot="input-otp-group"]')
    expect(grp?.className.includes('mygrp')).toBe(true)
  })
})
