import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPLY'

interface Brand {
  brandName?: string | null
  logoUrl?: string | null
  supportEmail?: string | null
}

interface DigitalReceiptProps {
  productName?: string
  fileName?: string
  downloadUrl?: string
  amount?: string
  expiresInHours?: number
  brand?: Brand
}

const DigitalProductReceiptEmail = ({
  productName,
  fileName,
  downloadUrl,
  amount,
  expiresInHours = 1,
  brand,
}: DigitalReceiptProps) => {
  const displayName = brand?.brandName || SITE_NAME
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your download is ready</Preview>
      <Body style={main}>
        <Container style={container}>
          {brand?.logoUrl ? (
            <Section style={{ textAlign: 'center', marginBottom: 20 }}>
              <Img src={brand.logoUrl} alt={displayName} height="28" style={{ display: 'inline-block' }} />
            </Section>
          ) : null}
          <Heading style={h1}>Thanks for your purchase 🎉</Heading>

          <Text style={text}>
            Your purchase of <strong>{productName || 'your digital product'}</strong>
            {amount ? ` (${amount})` : ''} is confirmed. Your download link is ready below.
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>FILE</Text>
            <Text style={cardValue}>{fileName || productName || 'Download'}</Text>
          </Section>

          {downloadUrl ? (
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button href={downloadUrl} style={button}>
                Download now
              </Button>
              <Text style={smallMuted}>
                This link expires in {expiresInHours} hour{expiresInHours === 1 ? '' : 's'}.
                If it expires, {brand?.supportEmail ? `contact ${brand.supportEmail}` : 'contact support'} and we'll send a fresh one.
              </Text>
            </Section>
          ) : null}

          <Hr style={hr} />

          <Text style={footer}>
            Need help? {brand?.supportEmail ? `Email ${brand.supportEmail}` : 'Just reply to this email'}.<br />
            — The {displayName} Team{brand?.brandName ? ` · powered by ${SITE_NAME}` : ''}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DigitalProductReceiptEmail,
  subject: (data: Record<string, any>) =>
    data?.productName ? `Your download: ${data.productName}` : 'Your download is ready',
  displayName: 'Digital product receipt',
  previewData: {
    productName: 'The Creator Playbook',
    fileName: 'creator-playbook.pdf',
    downloadUrl: 'https://example.com/signed-url',
    amount: '$19.00',
    expiresInHours: 1,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0A0A0A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#3A3A3A', lineHeight: '1.6', margin: '0 0 20px' }
const card = {
  background: '#F5F7F4',
  border: '1px solid #E2E8E0',
  borderRadius: '12px',
  padding: '14px 16px',
  margin: '20px 0',
}
const cardLabel = {
  fontSize: '10px', letterSpacing: '0.08em', color: '#6B7280',
  fontWeight: 700, textTransform: 'uppercase' as const, margin: '0 0 4px',
}
const cardValue = { fontSize: '14px', color: '#0A0A0A', fontWeight: 600, margin: 0 }
const button = {
  backgroundColor: '#00C853',
  color: '#0A0A0A',
  padding: '12px 24px',
  borderRadius: '999px',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: '14px',
  display: 'inline-block',
}
const smallMuted = { fontSize: '12px', color: '#6B7280', margin: '12px 0 0' }
const hr = { borderColor: '#E2E8E0', margin: '28px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 0', lineHeight: '1.6' }
