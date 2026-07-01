/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "UPLY"

type AlertKind = 'past_due' | 'canceling' | 'renewing_soon'

interface Row {
  email: string
  status: string
  current_period_end?: string | null
  cancel_at_period_end?: boolean
  stripe_customer_id?: string | null
}

interface Props {
  kind: AlertKind
  count: number
  rows: Row[]
  dashboardUrl?: string
}

const HEADINGS: Record<AlertKind, string> = {
  past_due: '⚠️ Blueprint subscribers past due',
  canceling: '📉 Blueprint subscribers canceling soon',
  renewing_soon: '🔁 Blueprint renewals in the next 3 days',
}

const SUBHEADS: Record<AlertKind, string> = {
  past_due: 'Payments failed and Stripe will keep retrying. Reach out before access is lost.',
  canceling: 'These members turned off auto-renew. A quick check-in often saves the sub.',
  renewing_soon: 'These renewals will hit their card in the next 3 days.',
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}

const Email = ({ kind, count, rows, dashboardUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{count} Blueprint {kind === 'past_due' ? 'past due' : kind === 'canceling' ? 'canceling' : 'renewing soon'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}><Text style={logoText}>⚡ UPLY</Text></Section>
        <Heading style={h1}>{HEADINGS[kind]}</Heading>
        <Text style={text}>{SUBHEADS[kind]}</Text>
        <Text style={countLine}>{count} subscriber{count === 1 ? '' : 's'} need attention.</Text>

        <Section style={tableWrap}>
          {rows.map((r, i) => (
            <Section key={i} style={row}>
              <Text style={rowEmail}>{r.email}</Text>
              <Text style={rowMeta}>
                Status: <strong>{r.status}</strong>
                {r.current_period_end ? ` · Period ends ${fmtDate(r.current_period_end)}` : ''}
                {r.cancel_at_period_end ? ' · cancel at period end' : ''}
              </Text>
            </Section>
          ))}
        </Section>

        <Section style={ctaSection}>
          <Button style={button} href={dashboardUrl || 'https://uply.tv/admin/blake-subscribers'}>
            Open subscribers dashboard
          </Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const kind = data?.kind as AlertKind
    const count = data?.count ?? 0
    if (kind === 'past_due') return `⚠️ ${count} Blueprint subscriber${count === 1 ? '' : 's'} past due`
    if (kind === 'canceling') return `📉 ${count} Blueprint subscriber${count === 1 ? '' : 's'} canceling`
    return `🔁 ${count} Blueprint renewal${count === 1 ? '' : 's'} in the next 3 days`
  },
  displayName: 'Blake subscription alert',
  previewData: {
    kind: 'past_due',
    count: 2,
    rows: [
      { email: 'trader1@example.com', status: 'past_due', current_period_end: new Date().toISOString() },
      { email: 'trader2@example.com', status: 'past_due', current_period_end: new Date().toISOString() },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', 'Space Grotesk', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logoText = { fontSize: '28px', fontWeight: 'bold' as const, color: '#000000', letterSpacing: '-0.5px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 12px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 12px' }
const countLine = { fontSize: '14px', color: '#000000', fontWeight: '600' as const, margin: '0 0 20px' }
const tableWrap = { border: '1px solid #e5e5e5', borderRadius: '10px', overflow: 'hidden' as const, marginBottom: '24px' }
const row = { padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }
const rowEmail = { fontSize: '14px', color: '#000000', fontWeight: '600' as const, margin: '0 0 4px' }
const rowMeta = { fontSize: '12px', color: '#666666', margin: '0' }
const ctaSection = { textAlign: 'center' as const, margin: '8px 0 24px' }
const button = {
  backgroundColor: '#00FF85', color: '#000000', fontWeight: 'bold' as const,
  fontSize: '15px', padding: '14px 32px', borderRadius: '8px',
  textDecoration: 'none', display: 'inline-block' as const,
}
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '4px 0' }
