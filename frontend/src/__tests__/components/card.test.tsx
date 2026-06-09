import React from 'react';
import { render, screen } from '@testing-library/react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '../../app/components/ui/card';

describe('Card component', () => {
  test('renders card with header, title, content and footer', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>My Title</CardTitle>
          <CardDescription>desc</CardDescription>
        </CardHeader>
        <CardContent>body</CardContent>
        <CardFooter>foot</CardFooter>
      </Card>
    );

    expect(document.querySelector('[data-slot="card"]')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="card-header"]')).toBeInTheDocument();
    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.getByText('desc')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByText('foot')).toBeInTheDocument();
  });

  test('renders card action slot when provided', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>With Action</CardTitle>
          <CardAction>act</CardAction>
        </CardHeader>
      </Card>
    );

    expect(document.querySelector('[data-slot="card-action"]')).toBeInTheDocument();
    expect(screen.getByText('act')).toBeInTheDocument();
  });
});
