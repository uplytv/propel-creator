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
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new email for UPLY</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://propel-creator.lovable.app/logo.png" width="100" height="32" alt="UPLY" style={logo} />
        <Heading style={h1}>Confirm your new email</Heading>
        <Text style={text}>
          You requested to change your UPLY email from{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>
          {' '}to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
          Tap below to confirm:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm Email Change
        </Button>
        <Text style={footer}>
          Didn't request this? Secure your account immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: 'hsl(0, 0%, 98%)', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const logo = { margin: '0 0 24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(260, 10%, 10%)', margin: '0 0 16px' }
const text = { fontSize: '15px', color: 'hsl(260, 5%, 45%)', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: 'hsl(265, 85%, 58%)', textDecoration: 'underline' }
const button = { backgroundColor: 'hsl(265, 85%, 58%)', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '0.75rem', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0', lineHeight: '1.5' }
