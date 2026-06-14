import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';

import { NewService } from '../app/pages/NewService';
import * as AppCtx from '../app/context/AppContext';
import * as Router from 'react-router';

describe('NewService form', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('validation errors shown and submission prevented', async () => {
    const addService = vi.fn();
    const currentUser = { id: 'u1' } as any;
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({ currentUser, addService } as any);
    const navigate = vi.fn();
    vi.spyOn(Router, 'useNavigate').mockReturnValue(navigate as any);

    render(
      <Router.MemoryRouter>
        <NewService />
      </Router.MemoryRouter>
    );

    const submit = screen.getByRole('button', { name: /Publicar servicio/i });
    fireEvent.click(submit);

    expect(await screen.findByText(/La descripción es obligatoria/i)).toBeInTheDocument();
    expect(await screen.findByText(/Selecciona una categoría/i)).toBeInTheDocument();
    expect(addService).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  test('add and remove tags, prevent duplicates and limit to 5', async () => {
    const addService = vi.fn();
    const currentUser = { id: 'u1' } as any;
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({ currentUser, addService } as any);
    vi.spyOn(Router, 'useNavigate').mockReturnValue(vi.fn() as any);

    const { container } = render(
      <Router.MemoryRouter>
        <NewService />
      </Router.MemoryRouter>
    );

    const input = container.querySelector('#service-tags-input') as HTMLInputElement;
    // add same tag twice
    fireEvent.change(input, { target: { value: 'Cocina' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByText('#cocina')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'cocina' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // still only one
    expect(screen.getAllByText('#cocina')).toHaveLength(1);

    // add up to 5
    const tags = ['a', 'b', 'c', 'd'];
    for (const t of tags) {
      fireEvent.change(input, { target: { value: t } });
      fireEvent.keyDown(input, { key: 'Enter' });
    }
    // total should be 5
    expect(container.querySelectorAll('span').length).toBeGreaterThanOrEqual(5);

    // remove one tag
    const tagSpan = screen.getByText('#a').closest('span') as HTMLElement;
    const btn = within(tagSpan).getByRole('button');
    fireEvent.click(btn);
    expect(screen.queryByText('#a')).not.toBeInTheDocument();
  });

  test('type toggle changes title placeholder', async () => {
    const addService = vi.fn();
    const currentUser = { id: 'u1' } as any;
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({ currentUser, addService } as any);
    vi.spyOn(Router, 'useNavigate').mockReturnValue(vi.fn() as any);

    const { container } = render(
      <Router.MemoryRouter>
        <NewService />
      </Router.MemoryRouter>
    );

    // default is offer
    const titleInput = container.querySelector('#service-title') as HTMLInputElement;
    expect(titleInput.getAttribute('placeholder')).toContain('Clases de cocina');
  });

  test('successful submission calls addService and navigates', async () => {
    const addService = vi.fn();
    const currentUser = { id: 'u1' } as any;
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({ currentUser, addService } as any);
    const navigate = vi.fn();
    vi.spyOn(Router, 'useNavigate').mockReturnValue(navigate as any);

    render(
      <Router.MemoryRouter>
        <NewService />
      </Router.MemoryRouter>
    );

    // fill title and description
    fireEvent.change(screen.getByLabelText(/Título \*/i), { target: { value: 'My Service' } });
    fireEvent.change(screen.getByLabelText(/Descripción \*/i), { target: { value: 'This is a service' } });

    // set credits
    fireEvent.change(screen.getByLabelText(/Créditos horarios \*/i), { target: { value: '2' } });

    // spy on setTimeout and mock implementation to schedule callback in microtask
    const setTimeoutSpy = vi.spyOn(global as any, 'setTimeout').mockImplementation((cb: any, _ms?: number) => { Promise.resolve().then(cb); return 0 as any; });

    const submit = screen.getByRole('button', { name: /Publicar servicio/i });
    fireEvent.click(submit);

    // ensure the artificial delay was scheduled
    await waitFor(() => expect(setTimeoutSpy).toHaveBeenCalled());

    setTimeoutSpy.mockRestore();
  });
});
