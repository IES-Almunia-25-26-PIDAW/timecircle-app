import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// Top-level mock for api endpoints so dynamic import in the component resolves to the mock
vi.mock('../app/api/endpoints', () => ({ apiGetMe: vi.fn() }));

// Mock react-easy-crop to allow onCropComplete to be invoked during tests
vi.mock('react-easy-crop', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => {
      React.useEffect(() => {
        if (typeof props.onCropComplete === 'function') {
          props.onCropComplete(null, { x: 0, y: 0, width: 10, height: 10 });
        }
      }, []);
      return React.createElement('div', { 'data-testid': 'mock-cropper' });
    },
  };
});

import { Profile } from '../app/pages/Profile';
import * as AppCtx from '../app/context/AppContext';
import * as Router from 'react-router';
import * as mockedEndpoints from '../app/api/endpoints';

// Ensure URL.createObjectURL / revokeObjectURL are available in tests
beforeEach(() => {
  // restore spies/mocks between tests
  vi.restoreAllMocks();
  // jsdom might not implement these helpers as expected
  // @ts-ignore
  global.URL.createObjectURL = global.URL.createObjectURL || vi.fn(() => 'blob:mock');
  // @ts-ignore
  global.URL.revokeObjectURL = global.URL.revokeObjectURL || vi.fn();
  // leave router hooks unmocked here; individual tests may mock useNavigate/useParams as needed
});

test('shows loading when user not found', () => {
  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'missing' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser: null,
    getUserById: () => undefined,
    services: [],
    getUserReviews: () => [],
    getUserTrades: () => [],
    startConversation: vi.fn(),
  } as any);

  render(
    <Router.MemoryRouter>
      <Profile />
    </Router.MemoryRouter>
  );

  expect(screen.getByText(/Cargando perfil.../i)).toBeInTheDocument();
});

test('opens edit modal for own profile and saves with removeAvatar', async () => {
  const user = {
    id: 'me',
    name: 'Me',
    avatar: 'https://example.com/av.png',
    location: 'Barrio',
    credits: 1,
    rating: 4.2,
    completedTrades: 0,
    memberSince: '2020-01-01T00:00:00Z',
    skills: [],
    hoursGiven: 0,
    hoursReceived: 0,
    bio: 'bio',
  } as any;

  const updateProfile = vi.fn().mockResolvedValue(undefined);

  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'me' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser: user,
    getUserById: () => user,
    services: [],
    getUserReviews: () => [],
    getUserTrades: () => [],
    startConversation: vi.fn(),
    updateProfile,
    requestLocation: vi.fn(),
  } as any);

  render(
    <Router.MemoryRouter>
      <Profile />
    </Router.MemoryRouter>
  );

  // Edit button should be visible for own profile
  const editBtn = screen.getByRole('button', { name: /Editar perfil/i });
  expect(editBtn).toBeInTheDocument();
  fireEvent.click(editBtn);

  // Modal input should appear
  const nameInput = await screen.findByLabelText(/Nombre completo/i);
  expect(nameInput).toBeInTheDocument();

  // Click "Eliminar" avatar and then save
  const delBtn = screen.getByRole('button', { name: /Eliminar/i });
  fireEvent.click(delBtn);

  const saveBtn = screen.getByRole('button', { name: /Guardar/i });
  fireEvent.click(saveBtn);

  await waitFor(() => expect(updateProfile).toHaveBeenCalled());
  expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ removeAvatar: true }));

  // Modal should be closed after save
  await waitFor(() => expect(screen.queryByLabelText(/Nombre completo/i)).not.toBeInTheDocument());
});

test('message button starts conversation and navigates', async () => {
  const currentUser = { id: 'me' } as any;
  const other = { id: 'other', name: 'Other', avatar: 'a.png', location: '', skills: [], credits: 0, rating: 0, completedTrades: 0, memberSince: '', hoursGiven: 0, hoursReceived: 0 } as any;

  const startConversation = vi.fn().mockResolvedValue('conv42');
  const navigate = vi.fn();

  vi.spyOn(Router, 'useNavigate').mockReturnValue(navigate as any);
  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'other' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser,
    getUserById: () => other,
    services: [],
    getUserReviews: () => [],
    getUserTrades: () => [],
    startConversation,
  } as any);

  render(
    <Router.MemoryRouter>
      <Profile />
    </Router.MemoryRouter>
  );

  const msgBtn = await screen.findByRole('button', { name: /Mensaje/i });
  fireEvent.click(msgBtn);

  await waitFor(() => expect(startConversation).toHaveBeenCalledWith('other'));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/messages?conv=conv42'));
});

test('tabs show services/reviews/stats fallbacks and content', async () => {
  const user = {
    id: 'u1',
    name: 'User',
    avatar: 'a.png',
    location: '',
    credits: 0,
    rating: 0,
    completedTrades: 0,
    memberSince: '',
    skills: [],
    hoursGiven: 5,
    hoursReceived: 2,
  } as any;

  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'u1' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser: null,
    getUserById: () => user,
    services: [],
    getUserReviews: () => [],
    getUserTrades: () => [],
    startConversation: vi.fn(),
  } as any);

  render(
    <Router.MemoryRouter>
      <Profile />
    </Router.MemoryRouter>
  );

  // Services tab default should show empty state
  expect(await screen.findByText(/No hay servicios activos/i)).toBeInTheDocument();

  // Switch to reviews tab
  const reviewsBtn = screen.getByRole('button', { name: /Valoraciones/i });
  fireEvent.click(reviewsBtn);
  expect(await screen.findByText(/No hay valoraciones todavía/i)).toBeInTheDocument();

  // Switch to stats tab
  const statsBtn = screen.getByRole('button', { name: /Estadísticas/i });
  fireEvent.click(statsBtn);
  expect(await screen.findByText('Horas dadas')).toBeInTheDocument();
});

test('edit modal "Usar mi ubicación actual" calls requestLocation and sets city/country', async () => {
  const user = {
    id: 'me', name: 'Me', avatar: 'a.png', location: 'Barrio', skills: [], credits: 0, rating: 0, completedTrades: 0, memberSince: '', hoursGiven: 0, hoursReceived: 0,
  } as any;

  const updateProfile = vi.fn().mockResolvedValue(undefined);
  const requestLocation = vi.fn().mockResolvedValue(undefined);

  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'me' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser: user,
    getUserById: () => user,
    services: [],
    getUserReviews: () => [],
    getUserTrades: () => [],
    startConversation: vi.fn(),
    updateProfile,
    requestLocation,
  } as any);

  // set mocked apiGetMe implementation
  mockedEndpoints.apiGetMe.mockResolvedValue({ city: 'CiudadTest', country: 'PaisTest' });

  render(
    <Router.MemoryRouter>
      <Profile />
    </Router.MemoryRouter>
  );

  const editBtn = await screen.findByRole('button', { name: /Editar perfil/i });
  fireEvent.click(editBtn);

  const useLocBtn = await screen.findByRole('button', { name: /Usar mi ubicación actual/i });
  fireEvent.click(useLocBtn);

  await waitFor(() => expect(requestLocation).toHaveBeenCalled());
  await waitFor(() => expect(updateProfile).toHaveBeenCalled());

  // The city input should be updated from mocked apiGetMe
  expect(await screen.findByDisplayValue('CiudadTest')).toBeInTheDocument();
  // clear mock for next tests
  mockedEndpoints.apiGetMe.mockReset();
});

test('shows active services for user', async () => {
  const user = { id: 'u2', name: 'Provider', avatar: 'a.png', skills: [], credits: 0, rating: 0, completedTrades: 0, memberSince: '', hoursGiven: 0, hoursReceived: 0 } as any;
  const service = { id: 's1', userId: 'u2', type: 'offer', title: 'Service One', category: 'hogar', credits: 2, status: 'active', createdAt: '2024-01-01' } as any;

  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'u2' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser: null,
    getUserById: (id: string) => id === 'u2' ? user : undefined,
    services: [service],
    getUserReviews: () => [],
    getUserTrades: () => [],
    startConversation: vi.fn(),
  } as any);

  render(
    <Router.MemoryRouter>
      <Profile />
    </Router.MemoryRouter>
  );

  expect(await screen.findByText('Service One')).toBeInTheDocument();
});

test('renders reviews with reviewer name and comment', async () => {
  const user = { id: 'u3', name: 'Reviewed', avatar: 'a.png', skills: [], credits: 0, rating: 0, completedTrades: 0, memberSince: '', hoursGiven: 0, hoursReceived: 0 } as any;
  const reviewer = { id: 'rev1', name: 'Reviewer', avatar: 'rev.png' } as any;
  const review = { id: 'r1', reviewerId: 'rev1', rating: 4, comment: 'Nice job', createdAt: '2022-01-01' } as any;

  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'u3' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser: null,
    getUserById: (id: string) => id === 'u3' ? user : (id === 'rev1' ? reviewer : undefined),
    services: [],
    getUserReviews: (uid: string) => uid === 'u3' ? [review] : [],
    getUserTrades: () => [],
    startConversation: vi.fn(),
  } as any);

  render(
    <Router.MemoryRouter>
      <Profile />
    </Router.MemoryRouter>
  );

  const reviewsBtn = await screen.findByRole('button', { name: /Valoraciones/i });
  fireEvent.click(reviewsBtn);

  expect(await screen.findByText(/Nice job/i)).toBeInTheDocument();
  expect(await screen.findByText(/Reviewer/i)).toBeInTheDocument();
});

test('shows badge, admin label and street address when shared', async () => {
  const user = {
    id: 'u4', name: 'Admin', avatar: 'a.png', skills: [], credits: 0, rating: 0, completedTrades: 0, memberSince: '', hoursGiven: 0, hoursReceived: 0,
    badge: 'gold', isAdmin: true, shareExactLocation: true, streetAddress: 'Calle 1', postalCode: '12345',
  } as any;

  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'u4' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser: null,
    getUserById: () => user,
    services: [],
    getUserReviews: () => [],
    getUserTrades: () => [],
    startConversation: vi.fn(),
  } as any);

  render(
    <Router.MemoryRouter>
      <Profile />
    </Router.MemoryRouter>
  );

  expect(await screen.findByText(/Vecino de Oro/i)).toBeInTheDocument();
  expect(await screen.findByText(/⚙️ Admin/i)).toBeInTheDocument();
  expect(await screen.findByText(/Calle 1, 12345/i)).toBeInTheDocument();
});

test('edit modal shows empty src for unsafe avatar URLs', async () => {
  const user = { id: 'me', name: 'Me', avatar: 'javascript:evil', skills: [], credits: 0, rating: 0, completedTrades: 0, memberSince: '', hoursGiven: 0, hoursReceived: 0 } as any;

  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'me' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser: user,
    getUserById: () => user,
    services: [],
    getUserReviews: () => [],
    getUserTrades: () => [],
    startConversation: vi.fn(),
    updateProfile: vi.fn(),
    requestLocation: vi.fn(),
  } as any);

  render(
    <Router.MemoryRouter>
      <Profile />
    </Router.MemoryRouter>
  );

  const editBtn = await screen.findByRole('button', { name: /Editar perfil/i });
  fireEvent.click(editBtn);

  const avatarImg = await screen.findByAltText('avatar');
  expect(avatarImg.getAttribute('src')).toBe('');
});

test('selecting non-image file does not show cropper and keeps avatar src', async () => {
  const user = { id: 'me', name: 'Me', avatar: 'https://example.com/av.png', skills: [], credits: 0, rating: 0, completedTrades: 0, memberSince: '', hoursGiven: 0, hoursReceived: 0 } as any;

  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'me' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser: user,
    getUserById: () => user,
    services: [],
    getUserReviews: () => [],
    getUserTrades: () => [],
    startConversation: vi.fn(),
    updateProfile: vi.fn(),
    requestLocation: vi.fn(),
  } as any);

  const { container } = render(
    <Router.MemoryRouter>
      <Profile />
    </Router.MemoryRouter>
  );

  const editBtn = await screen.findByRole('button', { name: /Editar perfil/i });
  fireEvent.click(editBtn);

  const input = container.querySelector('#edit-avatar') as HTMLInputElement;
  const txtFile = new File(['hi'], 'note.txt', { type: 'text/plain' });
  fireEvent.change(input, { target: { files: [txtFile] } });

  // Cropper action should not be present
  expect(screen.queryByText(/Recortar y usar/i)).not.toBeInTheDocument();

  const avatarImg = await screen.findByAltText('avatar');
  expect(avatarImg.getAttribute('src')).toContain('https://example.com/av.png');
});

test('dragging image file shows cropper and clicking recortar logs crop error', async () => {
  const user = { id: 'me', name: 'Me', avatar: 'https://example.com/av.png', skills: [], credits: 0, rating: 0, completedTrades: 0, memberSince: '', hoursGiven: 0, hoursReceived: 0 } as any;

  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'me' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser: user,
    getUserById: () => user,
    services: [],
    getUserReviews: () => [],
    getUserTrades: () => [],
    startConversation: vi.fn(),
    updateProfile: vi.fn(),
    requestLocation: vi.fn(),
  } as any);

  render(
    <Router.MemoryRouter>
      <Profile />
    </Router.MemoryRouter>
  );

  const editBtn = await screen.findByRole('button', { name: /Editar perfil/i });
  fireEvent.click(editBtn);

  const dropBtn = await screen.findByRole('button', { name: /Seleccionar o arrastrar foto de perfil/i });
  const imgFile = new File(['img'], 'avatar.png', { type: 'image/png' });
  // simulate drop
  fireEvent.drop(dropBtn, { dataTransfer: { files: [imgFile] } });

  // Recortar button should appear
  const recortar = await screen.findByText(/Recortar y usar/i);
  expect(recortar).toBeInTheDocument();

  // clicking the button should not throw
  fireEvent.click(recortar);
});

test('applyCrop success updates preview using canvas and Image mocks', async () => {
  const user = { id: 'me', name: 'Me', avatar: 'https://example.com/av.png', skills: [], credits: 0, rating: 0, completedTrades: 0, memberSince: '', hoursGiven: 0, hoursReceived: 0 } as any;

  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'me' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser: user,
    getUserById: () => user,
    services: [],
    getUserReviews: () => [],
    getUserTrades: () => [],
    startConversation: vi.fn(),
    updateProfile: vi.fn(),
    requestLocation: vi.fn(),
  } as any);

  // make createObjectURL return different values for File vs others
  const origCreate = global.URL.createObjectURL;
  // @ts-ignore
  global.URL.createObjectURL = (obj: any) => (obj instanceof File ? 'blob:cropped' : 'blob:initial');

  // stub Image to call onload
  const OrigImage = (global as any).Image;
  // @ts-ignore
  class MockImage {
    onload: any;
    onerror: any;
    crossOrigin: any;
    set src(_v: any) { setTimeout(() => this.onload && this.onload()); }
  }
  // @ts-ignore
  global.Image = MockImage;

  // stub canvas methods
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  const origToBlob = HTMLCanvasElement.prototype.toBlob;
  // @ts-ignore
  HTMLCanvasElement.prototype.getContext = function () { return { drawImage: () => {} }; };
  // @ts-ignore
  HTMLCanvasElement.prototype.toBlob = function (cb: any) { cb(new Blob(['x'], { type: 'image/jpeg' })); };

  try {
    const { container } = render(
      <Router.MemoryRouter>
        <Profile />
      </Router.MemoryRouter>
    );

    const editBtn = await screen.findByRole('button', { name: /Editar perfil/i });
    fireEvent.click(editBtn);

    const dropBtn = await screen.findByRole('button', { name: /Seleccionar o arrastrar foto de perfil/i });
    const imgFile = new File(['img'], 'avatar.png', { type: 'image/png' });
    fireEvent.drop(dropBtn, { dataTransfer: { files: [imgFile] } });

    const recortar = await screen.findByText(/Recortar y usar/i);
    fireEvent.click(recortar);

    // after successful crop the avatar img should point to cropped blob url
    const avatarImg = await screen.findByAltText('avatar');
    await waitFor(() => expect(avatarImg.getAttribute('src')).toContain('blob:cropped'));
  } finally {
    // restore
    // @ts-ignore
    global.URL.createObjectURL = origCreate;
    // @ts-ignore
    global.Image = OrigImage;
    // @ts-ignore
    HTMLCanvasElement.prototype.getContext = origGetContext;
    // @ts-ignore
    HTMLCanvasElement.prototype.toBlob = origToBlob;
  }
});

test('safe image src variants: data and http are preserved', async () => {
  const userData = { id: 'a', name: 'A', avatar: 'data:image/png;base64,AAA', skills: [], credits: 0, rating: 0, completedTrades: 0, memberSince: '', hoursGiven: 0, hoursReceived: 0 } as any;
  const userHttp = { id: 'b', name: 'B', avatar: 'http://example.com/i.png', skills: [], credits: 0, rating: 0, completedTrades: 0, memberSince: '', hoursGiven: 0, hoursReceived: 0 } as any;

  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'a' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser: userData,
    getUserById: () => userData,
    services: [],
    getUserReviews: () => [],
    getUserTrades: () => [],
    startConversation: vi.fn(),
  } as any);

  const { rerender } = render(
    <Router.MemoryRouter>
      <Profile />
    </Router.MemoryRouter>
  );

  let img = await screen.findByAltText('A');
  expect(img.getAttribute('src')).toContain('data:image/png;base64,AAA');

  // now test http
  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'b' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser: userHttp,
    getUserById: () => userHttp,
    services: [],
    getUserReviews: () => [],
    getUserTrades: () => [],
    startConversation: vi.fn(),
  } as any);

  rerender(
    <Router.MemoryRouter>
      <Profile />
    </Router.MemoryRouter>
  );

  img = await screen.findByAltText('B');
  expect(img.getAttribute('src')).toContain('http://example.com/i.png');
});

test('shows distance when available', async () => {
  const user = { id: 'd1', name: 'D', avatar: 'a.png', location: 'X', distanceKm: 7, skills: [], credits: 0, rating: 0, completedTrades: 0, memberSince: '', hoursGiven: 0, hoursReceived: 0 } as any;

  vi.spyOn(Router, 'useParams').mockReturnValue({ id: 'd1' } as any);
  vi.spyOn(AppCtx, 'useApp').mockReturnValue({
    currentUser: null,
    getUserById: () => user,
    services: [],
    getUserReviews: () => [],
    getUserTrades: () => [],
    startConversation: vi.fn(),
  } as any);

  render(
    <Router.MemoryRouter>
      <Profile />
    </Router.MemoryRouter>
  );

  expect(await screen.findByText(/7 km desde ti/i)).toBeInTheDocument();
});
