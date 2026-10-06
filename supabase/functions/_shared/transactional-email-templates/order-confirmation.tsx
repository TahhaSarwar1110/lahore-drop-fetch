import * as React from 'npm:react@18.3.1'
import { Button, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Layout, text, button, NAVY } from './layout.tsx'

interface Props {
  name?: string
  orderNumber?: string
  items?: { label: string; amount?: string }[]
  total?: string
  orderLink?: string
}

const row = { color: '#333333', fontSize: '14px', margin: '0', padding: '8px 0', borderBottom: '1px solid #eeeeee' }

function OrderConfirmation({ name = 'Customer', orderNumber = '', items = [], total = '', orderLink }: Props) {
  return (
    <Layout preview={`We've received your order #${orderNumber}`} title="We've received your order">
      <Text style={text}>Hi {name},</Text>
      <Text style={text}>
        Thank you for your order <strong>#{orderNumber}</strong>. Our team is reviewing it now and
        will keep you updated at every step.
      </Text>
      <Section style={{ margin: '8px 0 16px' }}>
        {items.map((i, idx) => (
          <Text key={idx} style={row}>
            {i.label}{i.amount ? <span style={{ float: 'right' }}>{i.amount}</span> : null}
          </Text>
        ))}
        <Text style={{ ...row, borderBottom: 'none', fontWeight: 'bold', color: NAVY }}>
          Total<span style={{ float: 'right' }}>{total}</span>
        </Text>
      </Section>
      {orderLink ? <Button href={orderLink} style={button}>Track your order</Button> : null}
    </Layout>
  )
}

export const template = {
  component: OrderConfirmation,
  subject: (d: Record<string, any>) => `Order #${d.orderNumber ?? ''} received - Tabedaar.com`,
  displayName: 'Order confirmation',
  previewData: {
    name: 'Ali',
    orderNumber: 'a1b2c3d4',
    items: [{ label: 'Kurta x2', amount: 'Rs. 3,000' }, { label: 'Groceries x1', amount: 'Rs. 1,500' }],
    total: 'Rs. 4,700',
    orderLink: 'https://tabedaar.com/order-history',
  },
} satisfies TemplateEntry
