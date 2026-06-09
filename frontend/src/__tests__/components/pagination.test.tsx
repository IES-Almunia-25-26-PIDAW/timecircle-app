import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('lucide-react', () => ({
  ChevronLeftIcon: () => React.createElement('svg', { 'data-icon': 'chev-left' }),
  ChevronRightIcon: () => React.createElement('svg', { 'data-icon': 'chev-right' }),
  MoreHorizontalIcon: () => React.createElement('svg', { 'data-icon': 'more' }),
}))

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '../../app/components/ui/pagination'

describe('Pagination UI wrappers', () => {
  test('Pagination renders nav and content', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    )

    expect(document.querySelector('[data-slot="pagination"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="pagination-content"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="pagination-item"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="pagination-link"]')).toBeTruthy()
  })

  test('PaginationLink active sets aria-current and data-active', () => {
    render(<PaginationLink isActive href="#">2</PaginationLink>)
    const link = document.querySelector('[data-slot="pagination-link"]') as HTMLElement
    expect(link.getAttribute('aria-current')).toBe('page')
    expect(link.getAttribute('data-active')).toBe('true')
  })

  test('Previous and Next render text and icons', () => {
    render(
      <div>
        <PaginationPrevious href="#prev">Prev</PaginationPrevious>
        <PaginationNext href="#next">Next</PaginationNext>
      </div>,
    )

    expect(document.querySelector('svg[data-icon="chev-left"]')).toBeTruthy()
    expect(document.querySelector('svg[data-icon="chev-right"]')).toBeTruthy()
    expect(screen.getByText('Previous')).toBeTruthy()
    expect(screen.getByText('Next')).toBeTruthy()
  })

  test('PaginationEllipsis renders MoreHorizontalIcon and sr-only text', () => {
    render(<PaginationEllipsis />)
    expect(document.querySelector('svg[data-icon="more"]')).toBeTruthy()
    expect(document.querySelector('span.sr-only')?.textContent).toBe('More pages')
  })
})
