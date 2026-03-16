/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your UPLY verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://propel-creator.lovable.app/logo.png" width="100" height="32" alt="UPLY" style={logo} />
        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>Use this code to confirm your identity on UPLY:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code expires shortly. If you didn't request it, ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: 'hsl(0, 0%, 98%)', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const logo = { margin: '0 0 24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(260, 10%, 10%)', margin: '0 0 16px' }
const text = { fontSize: '15px', color: 'hsl(260, 5%, 45%)', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = {
  fontFamily: "'SF Mono', Courier, monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: 'hsl(265, 85%, 58%)',
  letterSpacing: '4px',
  margin: '0 0 28px',
  padding: '16px 24px',
  backgroundColor: 'hsl(265, 85%, 96%)',
  borderRadius: '0.75rem',
  display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0', lineHeight: '1.5' }
