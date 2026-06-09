import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

// Mock react-day-picker to capture props and render a placeholder
vi.mock('react-day-picker', () => {
  const React = require('react');
  let lastProps: any = null;
  function DayPicker(props: any) {
    lastProps = props;
    return React.createElement('div', { 'data-testid': 'daypicker' }, 'daypicker');
  }
  (DayPicker as any).__getLastProps = () => lastProps;
  return { DayPicker };
});

import { Calendar } from '../../app/components/ui/calendar';

describe('Calendar UI wrapper', () => {
  beforeEach(() => {
    // clear module mocks so the DayPicker __getLastProps is fresh
    vi.resetModules();
  });

  test('renders DayPicker and passes default className and components', async () => {
    // Re-import mock to get the helper
    const dp = await import('react-day-picker');
    render(<Calendar />);

    expect(screen.getByTestId('daypicker')).toBeInTheDocument();
    const lastProps = (dp as any).DayPicker.__getLastProps();
    expect(lastProps).toBeTruthy();
    expect(lastProps.className).toContain('p-3');
    // components should include IconLeft and IconRight
    expect(typeof lastProps.components.IconLeft).toBe('function');
    expect(typeof lastProps.components.IconRight).toBe('function');
  });

  test('forwards classNames prop into DayPicker', async () => {
    const dp = await import('react-day-picker');
    render(<Calendar classNames={{ caption_label: 'my-caption' }} />);

    const lastProps = (dp as any).DayPicker.__getLastProps();
    expect(lastProps.classNames.caption_label).toBe('my-caption');
  });
});
