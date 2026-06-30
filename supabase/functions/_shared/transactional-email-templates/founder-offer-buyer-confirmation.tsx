import * as React from 'npm:react@18.3.1';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22';
import type { TemplateEntry } from './registry.ts';

interface Props {
  buyerName?: string;
  offerName?: string;
  amountFormatted?: string;
}

const Email = ({
  buyerName = 'there',
  offerName = 'your UPLY Founder Service',
  amountFormatted = '',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Thanks for booking {offerName} — we'll be in touch within 1 business day.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You're in, {buyerName}.</Heading>
        <Text style={lead}>
          Thanks for booking <strong>{offerName}</strong>
          {amountFormatted ? ` (${amountFormatted})` : ''}. Here's what
          happens next:
        </Text>
        <Section style={card}>
          <Text style={step}><strong>1. We received your payment.</strong> Your receipt is in a separate Stripe email.</Text>
          <Text style={step}><strong>2. A rep contacts you within 1 business day</strong> from a uply.tv address to schedule your kickoff call.</Text>
          <Text style={step}><strong>3. You hand off your content</strong> (notes, videos, ideas) and approve the course outline.</Text>
          <Text style={step}><strong>4. We build, upload, and publish.</strong> You launch.</Text>
        </Section>
        <Text style={lead}>
          Questions in the meantime? Just reply to this email or write{' '}
          <a href="mailto:founders@uply.tv" style={link}>founders@uply.tv</a>.
        </Text>
        <Text style={signoff}>— The UPLY team</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: 'Your UPLY course build is booked',
  displayName: 'Founder offer — buyer confirmation',
  previewData: {
    buyerName: 'Andy',
    offerName: 'Done-for-you Course Build',
    amountFormatted: '$495.00',
  },
} satisfies TemplateEntry;

const main = { backgroundColor: '#ffffff', fontFamily: 'Plus Jakarta Sans, Arial, sans-serif', color: '#0A0A0A' };
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' };
const h1 = { fontSize: '26px', fontWeight: 700, margin: '0 0 16px 0', color: '#0A0A0A' };
const lead = { fontSize: '15px', lineHeight: '24px', color: '#333', margin: '0 0 16px 0' };
const card = { backgroundColor: '#F6F6F6', borderRadius: '12px', padding: '18px 20px', margin: '12px 0 20px 0' };
const step = { fontSize: '14px', lineHeight: '22px', color: '#0A0A0A', margin: '0 0 10px 0' };
const link = { color: '#00b85f', textDecoration: 'underline' };
const signoff = { fontSize: '14px', color: '#555', marginTop: '20px' };
