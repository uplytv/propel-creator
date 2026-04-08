/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "UPLY"

interface WelcomeEmailProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — the creator network where you keep 95% of what you earn</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>⚡ UPLY</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Welcome aboard, ${name}!` : 'Welcome to UPLY!'}
        </Heading>
        <Text style={text}>
          You just joined the creator network built for independence. Stream live, sell products,
          build your community — and keep 95% of everything you earn.
        </Text>
        <Section style={ctaSection}>
          <Button style={button} href="https://uply.tv/dashboard">
            Go to your Dashboard
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={subtext}>Here's what you can do right now:</Text>
        <Text style={listItem}>🎥 Go live and start streaming</Text>
        <Text style={listItem}>🛍️ Create and sell digital products</Text>
        <Text style={listItem}>👥 Build your community space</Text>
        <Text style={listItem}>📊 Track your growth with real-time analytics</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Questions? Just reply to this email — we read every one.
        </Text>
        <Text style={footer}>
          — The UPLY Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to UPLY — let\'s build something great 🚀',
  displayName: 'Welcome email',
  previewData: { name: 'Alex' },
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
