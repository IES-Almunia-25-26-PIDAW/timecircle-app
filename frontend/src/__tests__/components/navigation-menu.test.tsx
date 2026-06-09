import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('lucide-react', () => ({ ChevronDownIcon: () => React.createElement('svg', { 'data-icon': 'chev' }) }))

vi.mock('@radix-ui/react-navigation-menu', () => {
  const React = require('react')
  const Root = (props: any) => React.createElement('div', { 'data-slot': 'navigation-menu', ...props }, props.children)
  const List = (props: any) => React.createElement('div', { 'data-slot': 'navigation-menu-list', ...props }, props.children)
  const Item = (props: any) => React.createElement('div', { 'data-slot': 'navigation-menu-item', ...props }, props.children)
  const Trigger = (props: any) => React.createElement('button', { 'data-slot': 'navigation-menu-trigger', ...props }, props.children)
  const Content = (props: any) => React.createElement('div', { 'data-slot': 'navigation-menu-content', ...props }, props.children)
  const Viewport = (props: any) => React.createElement('div', { 'data-slot': 'navigation-menu-viewport', ...props }, props.children)
  const Link = (props: any) => React.createElement('a', { 'data-slot': 'navigation-menu-link', ...props }, props.children)
  const Indicator = (props: any) => React.createElement('div', { 'data-slot': 'navigation-menu-indicator', ...props }, props.children)
  return { Root, List, Item, Trigger, Content, Viewport, Link, Indicator }
})

import {
  NavigationMenu,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuViewport,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuIndicator,
  navigationMenuTriggerStyle,
} from '../../app/components/ui/navigation-menu'

describe('NavigationMenu UI wrapper', () => {
  test('renders trigger and viewport by default', () => {
    render(
      <NavigationMenu>
        <NavigationMenuTrigger>Menu</NavigationMenuTrigger>
      </NavigationMenu>,
    )

    expect(screen.getByText('Menu')).toBeTruthy()
    expect(document.querySelector('[data-slot="navigation-menu-viewport"]')).toBeTruthy()
  })

  test('hides viewport when viewport=false', () => {
    render(
      <NavigationMenu viewport={false}>
        <NavigationMenuTrigger>Menu</NavigationMenuTrigger>
      </NavigationMenu>,
    )

    expect(screen.getByText('Menu')).toBeTruthy()
    expect(document.querySelector('[data-slot="navigation-menu-viewport"]')).toBeNull()
  })

  test('NavigationMenuTrigger includes chevron icon', () => {
    render(
      <NavigationMenu>
        <NavigationMenuTrigger>Menu</NavigationMenuTrigger>
      </NavigationMenu>,
    )

    expect(document.querySelector('svg[data-icon="chev"]')).toBeTruthy()
  })

  test('NavigationMenuList and Item render with provided classNames', () => {
    render(
      <NavigationMenuList className="my-list">
        <NavigationMenuItem className="my-item" />
      </NavigationMenuList>,
    )

    const list = document.querySelector('[data-slot="navigation-menu-list"]')
    const item = document.querySelector('[data-slot="navigation-menu-item"]')
    expect(list).toBeTruthy()
    expect(list?.className.includes('my-list')).toBe(true)
    expect(item).toBeTruthy()
    expect(item?.className.includes('my-item')).toBe(true)
  })

  test('NavigationMenuContent and Viewport render correctly', () => {
    render(
      <div>
        <NavigationMenuContent className="cnt">Hello</NavigationMenuContent>
        <NavigationMenuViewport />
      </div>,
    )

    expect(document.querySelector('[data-slot="navigation-menu-content"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="navigation-menu-viewport"]')).toBeTruthy()
  })

  test('NavigationMenuLink and Indicator render', () => {
    render(
      <div>
        <NavigationMenuLink className="lnk">Go</NavigationMenuLink>
        <NavigationMenuIndicator className="ind" />
      </div>,
    )

    const link = document.querySelector('[data-slot="navigation-menu-link"]')
    const ind = document.querySelector('[data-slot="navigation-menu-indicator"]')
    expect(link).toBeTruthy()
    expect(link?.className.includes('lnk')).toBe(true)
    expect(ind).toBeTruthy()
    expect(ind?.querySelector('div')).toBeTruthy()
  })

  test('navigationMenuTriggerStyle returns a string', () => {
    const cls = navigationMenuTriggerStyle()
    expect(typeof cls).toBe('string')
    expect(cls.length).toBeGreaterThan(0)
  })
})
