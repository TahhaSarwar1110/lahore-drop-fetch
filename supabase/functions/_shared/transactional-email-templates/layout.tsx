import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'

export const NAVY = '#0d1e4a'
export const ORANGE = '#f15717'

export const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
export const container = { maxWidth: '560px', margin: '0 auto', padding: '0 0 24px' }
export const header = { backgroundColor: NAVY, padding: '20px 24px', borderRadius: '8px 8px 0 0' }
export const brand = { color: '#ffffff', fontSize: '22px', fontWeight: 'bold', margin: 0 }
export const content = { padding: '24px' }
export const h1 = { color: NAVY, fontSize: '20px', margin: '0 0 16px' }
export const text = { color: '#333333', fontSize: '15px', lineHeight: '22px', margin: '0 0 14px' }
export const button = {
  backgroundColor: ORANGE, color: '#ffffff', padding: '12px 22px', borderRadius: '6px',
  textDecoration: 'none', fontWeight: 'bold', fontSize: '15px', display: 'inline-block',
}
export const footer = { color: '#888888', fontSize: '12px', lineHeight: '18px', padding: '0 24px' }

export function Layout({ preview, title, children }: { preview: string; title: string; children: React.ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>Tabedaar<span style={{ color: ORANGE }}>.com</span></Text>
          </Section>
          <Section style={content}>
            <Heading style={h1}>{title}</Heading>
            {children}
          </Section>
          <Hr style={{ borderColor: '#eeeeee', margin: '8px 24px 16px' }} />
          <Text style={footer}>
            Questions? Just reply to this email or write to contact@tabedaar.com.
            <br />Thank you for shopping with Tabedaar.com.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
