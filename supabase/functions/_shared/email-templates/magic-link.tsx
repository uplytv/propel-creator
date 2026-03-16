/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your UPLY login link</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://propel-creator.lovable.app/logo.png" width="100" height="32" alt="UPLY" style={logo} />
        <Heading style={h1}>Your login link ✨</Heading>
        <Text style={text}>
          Tap the button below to log in to UPLY. This link expires shortly, so use it now.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Log In to UPLY
        </Button>
        <Text style={footer}>
          Didn't request this? You can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: 'hsl(0, 0%, 98%)', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const logo = { margin: '0 0 24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(260, 10%, 10%)', margin: '0 0 16px' }
const text = { fontSize: '15px', color: 'hsl(260, 5%, 45%)', lineHeight: '1.6', margin: '0 0 20px' }
const button = { backgroundColor: 'hsl(265, 85%, 58%)', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '0.75rem', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0', lineHeight: '1.5' }
