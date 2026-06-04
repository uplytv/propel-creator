/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "UPLY"

interface ApplicationConfirmationProps {
  name?: string
  qualified?: boolean
}

const ApplicationConfirmationEmail = ({ name, qualified }: ApplicationConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your UPLY application — here's what happens next</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>⚡ UPLY</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Thanks, ${name}!` : 'Thanks for applying!'}
        </Heading>
        <Text style={text}>
          We received your UPLY creator application and our team is reviewing it.
          {qualified
            ? ' Based on your answers, you qualify for an intro call. Book a time below and we\'ll get you set up.'
            : ' You\'re on the waitlist and we\'ll reach out as soon as a spot opens up.'}
        </Text>
        <Section style={ctaSection}>
          {qualified ? (
            <Button style={button} href="https://cal.com/uplytv">
              Book your intro call
            </Button>
          ) : (
            <Button style={button} href="https://uply.tv/waitlist">
              View waitlist status
            </Button>
          )}
        </Section>
        <Hr style={hr} />
        <Text style={subtext}>What to expect:</Text>
        <Text style={listItem}>
          {qualified
            ? '📞 Book a 15-minute call to activate your account'
            : '⏳ Waitlist review typically takes 1–2 weeks'}
        </Text>
        <Text style={listItem}>🎥 Stream live, sell products, build your community</Text>
        <Text style={listItem}>💰 Keep 95% of everything you earn on UPLY</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Questions? Just reply to this email — we read every one.
        </Text>
        <Text style={footer}>
          — The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ApplicationConfirmationEmail,
  subject: 'We received your UPLY application ✅',
  displayName: 'Application confirmation',
  previewData: { name: 'Alex', qualified: true },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', 'Space Grotesk', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logoText = { fontSize: '28px', fontWeight: 'bold' as const, color: '#000000', letterSpacing: '-0.5px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 24px' }
const subtext = { fontSize: '14px', color: '#333333', fontWeight: '600' as const, margin: '0 0 12px' }
const listItem = { fontSize: '14px', color: '#55575d', lineHeight: '1.8', margin: '0', paddingLeft: '4px' }
const ctaSection = { textAlign: 'center' as const, margin: '8px 0 32px' }
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
