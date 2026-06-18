/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "UPLY"

interface Brand {
  brandName?: string | null
  logoUrl?: string | null
  supportEmail?: string | null
}

interface TicketConfirmationProps {
  name?: string
  eventTitle: string
  eventDate?: string
  eventLocation?: string
  ticketCode?: string
  qrToken: string
  ticketUrl: string
  brand?: Brand
}

const TicketConfirmationEmail = ({
  name,
  eventTitle,
  eventDate,
  eventLocation,
  ticketCode,
  qrToken,
  ticketUrl,
  brand,
}: TicketConfirmationProps) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(qrToken)}`
  const displayName = brand?.brandName || SITE_NAME
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your ticket for {eventTitle} is confirmed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            {brand?.logoUrl ? (
              <Img src={brand.logoUrl} alt={displayName} height="32" style={{ display: 'inline-block' }} />
            ) : (
              <Text style={logoText}>⚡ {displayName}</Text>
            )}
          </Section>
          <Heading style={h1}>
            🎟️ {name ? `${name}, you're going!` : `You're going!`}
          </Heading>
          <Text style={text}>
            Your ticket for <strong>{eventTitle}</strong> is confirmed. Show this QR code at the door for entry.
          </Text>

          <Section style={ticketCard}>
            <Text style={eventTitleStyle}>{eventTitle}</Text>
            {eventDate && <Text style={detail}>📅 {eventDate}</Text>}
            {eventLocation && <Text style={detail}>📍 {eventLocation}</Text>}
            <Section style={qrWrap}>
              <Img src={qrUrl} alt="Ticket QR code" width="220" height="220" style={qrImg} />
            </Section>
            {ticketCode && <Text style={ticketCodeStyle}>Ticket #{ticketCode}</Text>}
          </Section>

          <Section style={ctaSection}>
            <Button style={button} href={ticketUrl}>
              View ticket
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Save this email or open your ticket before the event. Entry requires a valid QR code.
          </Text>
          <Text style={footer}>
            — The {displayName} Team
            {brand?.brandName ? ` · powered by ${SITE_NAME}` : ''}
          </Text>
          {brand?.supportEmail && (
            <Text style={footer}>Questions? Reply to this email or contact {brand.supportEmail}.</Text>
          )}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TicketConfirmationEmail,
  subject: (data: Record<string, any>) => `🎟️ Your ticket: ${data?.eventTitle ?? 'event'}`,
  displayName: 'Ticket confirmation',
  previewData: {
    name: 'Alex',
    eventTitle: 'UPLY Launch Night',
    eventDate: 'Fri, May 9 · 7:00 PM',
    eventLocation: 'The Forum, Los Angeles',
    ticketCode: 'A1B2C3',
    qrToken: 'sample-qr-token',
    ticketUrl: 'https://uply.tv/tickets/sample',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', 'Space Grotesk', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logoText = { fontSize: '28px', fontWeight: 'bold' as const, color: '#000000', letterSpacing: '-0.5px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 24px' }
const ticketCard = {
  background: '#f8f8f8',
  border: '1px solid #e5e5e5',
  borderRadius: '12px',
  padding: '24px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const eventTitleStyle = { fontSize: '18px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 8px' }
const detail = { fontSize: '14px', color: '#55575d', margin: '4px 0' }
const qrWrap = { textAlign: 'center' as const, margin: '20px 0 12px' }
const qrImg = { borderRadius: '8px', display: 'inline-block' as const }
const ticketCodeStyle = { fontSize: '12px', color: '#999999', fontFamily: 'monospace', margin: '8px 0 0' }
const ctaSection = { textAlign: 'center' as const, margin: '8px 0 24px' }
const button = {
  backgroundColor: '#00FF85',
  color: '#000000',
  fontWeight: 'bold' as const,
  fontSize: '15px',
  padding: '14px 32px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '4px 0', lineHeight: '1.5' }
