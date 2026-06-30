/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface BookingInquiryProps {
  artistName?: string
  inquirerName?: string
  inquirerEmail?: string
  eventDates?: string
  message?: string
}

const BookingInquiryEmail = ({
  artistName,
  inquirerName,
  inquirerEmail,
  eventDates,
  message,
}: BookingInquiryProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      New booking inquiry{inquirerName ? ` from ${inquirerName}` : ''}
      {artistName ? ` for ${artistName}` : ''}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>⚡ UPLY</Text>
        </Section>
        <Heading style={h1}>New booking inquiry</Heading>
        <Text style={text}>
          {artistName ? `${artistName} just received a new booking inquiry through UPLY.` : 'A new booking inquiry just came in through UPLY.'}
        </Text>

        <Section style={card}>
          <Text style={label}>From</Text>
          <Text style={value}>{inquirerName || '—'}</Text>

          <Text style={label}>Reply to</Text>
          <Text style={value}>{inquirerEmail || '—'}</Text>

          <Text style={label}>Event dates</Text>
          <Text style={value}>{eventDates || 'Not specified'}</Text>

          <Text style={label}>Message</Text>
          <Text style={messageStyle}>{message || '—'}</Text>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Reply directly to this email to reach {inquirerName || 'the sender'}.
        </Text>
        <Text style={footer}>— UPLY Bookings</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingInquiryEmail,
  subject: (d: Record<string, any>) =>
    `New booking inquiry${d?.artistName ? ` — ${d.artistName}` : ''}${d?.inquirerName ? ` (from ${d.inquirerName})` : ''}`,
  displayName: 'Booking inquiry',
  previewData: {
    artistName: 'BAZI',
    inquirerName: 'Jane Doe',
    inquirerEmail: 'jane@example.com',
    eventDates: 'Sat, Aug 16, 2026',
    message: 'Looking to book a 2-hour open-format set for a wedding in Malibu.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', 'Space Grotesk', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logoText = { fontSize: '28px', fontWeight: 'bold' as const, color: '#000000', letterSpacing: '-0.5px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 24px' }
const card = { backgroundColor: '#f7f7f8', borderRadius: '12px', padding: '20px 22px', margin: '0 0 24px' }
const label = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#888a8f', fontWeight: '600' as const, margin: '14px 0 4px' }
const value = { fontSize: '15px', color: '#111114', margin: '0', lineHeight: '1.5', fontWeight: '600' as const }
const messageStyle = { fontSize: '14px', color: '#33363c', margin: '0', lineHeight: '1.6', whiteSpace: 'pre-wrap' as const }
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '4px 0', lineHeight: '1.5' }
