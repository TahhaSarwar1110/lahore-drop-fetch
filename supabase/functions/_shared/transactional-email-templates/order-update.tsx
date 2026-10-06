import * as React from 'npm:react@18.3.1'
import { Button, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Layout, text, button } from './layout.tsx'

interface Props {
  name?: string
  title?: string
  message?: string
  orderLink?: string
}

function OrderUpdate({ name = 'Customer', title = 'Order update', message = '', orderLink }: Props) {
  return (
    <Layout preview={title} title={title}>
      <Text style={text}>Hi {name},</Text>
      <Text style={text}>{message}</Text>
      {orderLink ? <Button href={orderLink} style={button}>View order details</Button> : null}
    </Layout>
  )
}

export const template = {
  component: OrderUpdate,
  subject: (d: Record<string, any>) => `${d.title ?? 'Order update'} - Tabedaar.com`,
  displayName: 'Order update',
  previewData: {
    name: 'Ali',
    title: 'Delivery charges added',
    message: 'Delivery charges of Rs. 500 have been added to your order. Please review and confirm.',
    orderLink: 'https://tabedaar.com/order-history',
  },
} satisfies TemplateEntry
