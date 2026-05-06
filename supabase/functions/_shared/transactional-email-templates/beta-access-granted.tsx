/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "UPLY"

interface BetaAccessGrantedProps {
  name?: string
}

const BetaAccessGrantedEmail = ({ name }: BetaAccessGrantedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're in — your UPLY beta access is live</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>⚡ UPLY</Text>
        </Section>
        <Heading style={h1}>
          {name ? `You're in, ${name}!` : `You're in!`}
        </Heading>
        <Text style={text}>
          Your UPLY beta access has been approved. The full creator network is now unlocked —
          go live, sell products, build your community, and keep 95% of what you earn.
        </Text>
        <Section style={ctaSection}>
          <Button style={button} href="https://uply.tv/dashboard">
            Open your Dashboard
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={subtext}>Start with these:</Text>
        <Text style={listItem}>🎥 Set up your first stream</Text>
        <Text style={listItem}>🛍️ Add your first product</Text>
        <Text style={listItem}>👥 Invite your community</Text>
        <Hr style={hr} />
        <Text style={footer}>Welcome aboard.</Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BetaAccessGrantedEmail,
  subject: "You're in — UPLY beta access granted 🎉",
  displayName: 'Beta access granted',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', 'Space Grotesk', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logoText = { fontSize: '28px', fontWeight: 'bold' as const, color: '#000000', letterSpacing: '-0.5px' }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 16px', lineHeight: '1.2' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 24px' }
const subtext = { fontSize: '14px', color: '#333333', fontWeight: '600' as const, margin: '0 0 12px' }
const listItem = { fontSize: '14px', color: '#55575d', lineHeight: '1.8', margin: '0' }
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
