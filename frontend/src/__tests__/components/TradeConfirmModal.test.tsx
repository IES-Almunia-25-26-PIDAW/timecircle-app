import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TradeConfirmModal from '../../app/components/TradeConfirmModal'

const baseProps = {
  visible: true,
  message: 'Do you want to confirm this trade?',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
}

describe('TradeConfirmModal', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(<TradeConfirmModal {...baseProps} visible={false} />)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByText(baseProps.message)).not.toBeInTheDocument()
  })

  it('renders the default labels without a title', () => {
    render(<TradeConfirmModal {...baseProps} />)

    expect(screen.getByText(baseProps.message)).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
  })

  it('renders custom title and labels', () => {
    render(
      <TradeConfirmModal
        {...baseProps}
        title="Confirm trade start"
        cancelLabel="Not yet"
        confirmLabel="Start now"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Confirm trade start' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Not yet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start now' })).toBeInTheDocument()
  })

  it('calls the cancel and confirm handlers', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()

    render(<TradeConfirmModal {...baseProps} onCancel={onCancel} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
