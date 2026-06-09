import { describe, test, expect } from 'vitest';

import {
  mapUser,
  mapService,
  mapTrade,
  mapMessage,
  mergeConversationMessages,
} from '../app/context/AppContext';

describe('AppContext mappers', () => {
  test('mapUser handles leading-slash avatar and numeric conversions', () => {
    const raw = {
      id: 1,
      username: 'bob',
      avatar: '/me.png',
      latitude: '12.34',
      longitude: '56.78',
      rating: '4.2',
      total_reviews: 2,
      member_since: '2022-01-02T12:00:00Z',
      skills: ['x'],
      badge: 'gold',
      completed_trades: 3,
      is_admin: true,
      hours_given: 5,
      hours_received: 2,
      search_radius_km: 10,
      share_exact_location: true,
      street_address: 'addr',
      postal_code: '12345',
    } as any;

    const u = mapUser(raw);
    expect(u.id).toBe('1');
    expect(u.avatar.endsWith('/me.png')).toBeTruthy();
    expect(typeof u.latitude).toBe('number');
    expect(u.latitude).toBeCloseTo(12.34);
    expect(u.longitude).toBeCloseTo(56.78);
    expect(u.rating).toBeCloseTo(4.2);
    expect(u.memberSince).toBe('2022-01-02');
    expect(u.skills).toEqual(['x']);
    expect(u.isAdmin).toBe(true);
  });

  test('mapUser falls back to dicebear when avatar missing', () => {
    const raw = { id: 2, username: 'alice' } as any;
    const u = mapUser(raw);
    expect(u.avatar).toContain('alice');
  });

  test('mapService maps tags and category', () => {
    const raw = {
      id: 5,
      user: { id: 7, username: 'u' },
      type: 'offer',
      title: 'T',
      description: 'D',
      category: { name: 'Hogar' },
      duration: 60,
      credits: 2,
      status: 'active',
      created_at: '2022-01-01T00:00:00Z',
      tags: ['x', { name: 'y' }],
      distance_km: 3,
      proximity: 'close',
    } as any;

    const s = mapService(raw);
    expect(s.id).toBe('5');
    expect(s.category).toBe('hogar');
    expect(s.tags).toEqual(['x', 'y']);
    expect(s.user).toBeDefined();
  });

  test('mapTrade maps completedAt and lastProposedById and endConfirmations', () => {
    const raw = {
      id: 10,
      service: 1,
      offerer: 2,
      requester: 3,
      status: 'pending',
      scheduled_date: '2023-06-01T00:00:00Z',
      credits_amount: 2,
      created_at: '2023-05-01T00:00:00Z',
      completed_at: '2023-05-02T00:00:00Z',
      last_proposed_by: { id: 8 },
      last_proposed_at: '2023-05-03T00:00:00Z',
      conversation_id: '9',
      end_confirmations: ['a', 'b'],
    } as any;

    const t = mapTrade(raw);
    expect(t.id).toBe('10');
    expect(t.completedAt).toBe('2023-05-02');
    expect(t.lastProposedById).toBe('8');
    expect(t.conversationId).toBe('9');
    expect(t.endConfirmations).toEqual(['a', 'b']);
  });

  test('mapMessage maps trade and payload', () => {
    const trade = { id: 11, service: 2, offerer: 1 } as any;
    const raw = { id: 100, sender: 2, content: 'hi', trade, message_type: 'text', payload: { x: 1 }, timestamp: 't' } as any;
    const m = mapMessage(raw, '42');
    expect(m.id).toBe('100');
    expect(m.conversationId).toBe('42');
    expect(m.trade).toBeDefined();
    expect(m.payload).toEqual({ x: 1 });
  });

  test('mergeConversationMessages updates existing and appends new', () => {
    const existing = [
      { id: '1', conversationId: 'c', senderId: '1', content: 'a', timestamp: 't1', read: false } as any,
      { id: '2', conversationId: 'c', senderId: '2', content: 'b', timestamp: 't2', read: false } as any,
    ];
    const incoming = [
      { id: '2', conversationId: 'c', senderId: '2', content: 'b-new', timestamp: 't2', read: true } as any,
      { id: '3', conversationId: 'c', senderId: '3', content: 'c', timestamp: 't3', read: false } as any,
    ];

    const merged = mergeConversationMessages(existing, incoming);
    // should include updated '2' with read true and new '3'
    const ids = merged.map(m => m.id);
    expect(ids).toContain('1');
    expect(ids).toContain('2');
    expect(ids).toContain('3');
    const two = merged.find(m => m.id === '2');
    expect(two?.read).toBe(true);
  });
});
