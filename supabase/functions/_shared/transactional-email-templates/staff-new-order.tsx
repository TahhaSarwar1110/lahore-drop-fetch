import * as React from 'npm:react@18.3.1'
import { Button, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Layout, text, button, NAVY } from './layout.tsx'

interface Props {
  customerName?: string
  customerPhone?: string
  orderNumber?: string
  items?: { label: string; amount?: string }[]
  total?: string
  dashboardLink?: string
}

const row = { color: '#333333', fontSize: '14px', margin: '0', padding: '8px 0', borderBottom: '1px solid #eeeeee' }

function StaffNewOrder({ customerName = 'A customer', customerPhone, orderNumber = '', items = [], total = '', dashboardLink }: Props) {
  return (
    <Layout preview={`New order #${orderNumber} from ${customerName}`} title="New order placed">
      <Text style={text}>
        <strong>{customerName}</strong>{customerPhone ? ` (${customerPhone})` : ''} has placed order{' '}
        <strong>#{orderNumber}</strong>. Please review it in the manager dashboard.
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
      {dashboardLink ? <Button href={dashboardLink} style={button}>Open manager dashboard</Button> : null}
    </Layout>
  )
}

export const template = {
  component: StaffNewOrder,
  subject: (d: Record<string, any>) => `New order #${d.orderNumber ?? ''} placed - Tabedaar.com`,
  displayName: 'New order (staff inbox)',
  to: 'contact@tabedaar.com',
  previewData: {
    customerName: 'Ali Khan',
    customerPhone: '03001112222',
    orderNumber: 'a1b2c3d4',
    items: [{ label: 'Kurta x2', amount: 'Rs. 3,000' }],
    total: 'Rs. 3,000',
    dashboardLink: 'https://tabedaar.com/manager',
  },
} satisfies TemplateEntry
