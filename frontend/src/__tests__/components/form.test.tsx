import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useForm } from 'react-hook-form'

import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from '../../app/components/ui/form'

describe('Form UI wrappers', () => {
  test('shows description and renders error message when form has error', async () => {
    function Test() {
      const methods = useForm()
      React.useEffect(() => {
        // ensure controller has registered the field then trigger validation
        setTimeout(() => methods.trigger('name' as any), 0)
      }, [])

      return (
        <Form {...methods}>
          <FormItem>
            <FormField
              name={'name'}
              control={methods.control}
              rules={{ required: 'Required' }}
              render={({ field }) => (
                <>
                  <FormLabel>Name</FormLabel>
                  <FormControl asChild>
                    <input placeholder="name" {...field} />
                  </FormControl>
                </>
              )}
            />
            <FormDescription>Enter name</FormDescription>
            <FormMessage />
          </FormItem>
        </Form>
      )
    }

    render(<Test />)

    await waitFor(() => {
      const input = screen.getByPlaceholderText('name')
      // Form should mark the control as invalid and include the message id in aria-describedby
      expect(input.getAttribute('aria-invalid')).toBe('true')
      expect(input.getAttribute('aria-describedby')?.includes('-form-item-message')).toBe(true)
    })
  })

  test('does not render FormMessage when there is no error', () => {
    function Test() {
      const methods = useForm()
      return (
        <Form {...methods}>
          <FormItem>
            <FormField
              name={'name'}
              control={methods.control}
              render={({ field }) => (
                <>
                  <FormLabel>Name</FormLabel>
                  <FormControl asChild>
                    <input placeholder="name" {...field} />
                  </FormControl>
                </>
              )}
            />
            <FormDescription>Enter name</FormDescription>
            <FormMessage />
          </FormItem>
        </Form>
      )
    }

    render(<Test />)
    expect(document.querySelector('[data-slot="form-message"]')).toBeNull()
  })
})
