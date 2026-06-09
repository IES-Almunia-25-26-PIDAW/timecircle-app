import React from 'react';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

// Mock embla-carousel-react hook
const scrollPrev = vi.fn();
const scrollNext = vi.fn();
const on = vi.fn();
const off = vi.fn();
const apiMock = {
  scrollPrev,
  scrollNext,
  on,
  off,
  canScrollPrev: () => true,
  canScrollNext: () => true,
};

vi.mock('embla-carousel-react', () => ({
  default: () => [() => {}, apiMock],
}));

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '../../app/components/ui/carousel';

describe('Carousel components', () => {
  test('renders slots and buttons work', async () => {
    

    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>one</CarouselItem>
          <CarouselItem>two</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    );

    expect(document.querySelector('[data-slot="carousel"]')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="carousel-content"]')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="carousel-item"]')).toHaveLength(2);

    const prev = document.querySelector('[data-slot="carousel-previous"]');
    const next = document.querySelector('[data-slot="carousel-next"]');
    expect(prev).toBeInTheDocument();
    expect(next).toBeInTheDocument();

    fireEvent.click(prev!);
    expect(scrollPrev).toHaveBeenCalled();

    fireEvent.click(next!);
    expect(scrollNext).toHaveBeenCalled();
  });
});
