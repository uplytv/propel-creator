/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your UPLY login link</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>UPLY</Text>
        </Section>
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>
          Click the button below to log in to UPLY. This link expires shortly.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Log In to UPLY
        </Button>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { marginBottom: '24px' }
const logoText = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0A0A0A', letterSpacing: '2px', margin: '0' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0A0A0A',
  margin: '0 0 16px',
  fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', Arial, sans-serif",
}
const text = { fontSize: '15px', color: '#555555', lineHeight: '1.6', margin: '0 0 20px' }
const button = {
  backgroundColor: '#00FF85',
  color: '#0A0A0A',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  marginBottom: '24px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0', lineHeight: '1.5' }
