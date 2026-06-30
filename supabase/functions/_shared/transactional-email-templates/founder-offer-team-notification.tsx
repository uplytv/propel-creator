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
  offerName?: string;
  offerKey?: string;
  buyerEmail?: string;
  buyerName?: string;
  buyerPhone?: string;
  amountFormatted?: string;
  stripeSessionId?: string;
  userId?: string;
}

const Email = ({
  offerName = 'Founder Service',
  offerKey = '',
  buyerEmail = '',
  buyerName = '',
  buyerPhone = '',
  amountFormatted = '',
  stripeSessionId = '',
  userId = '',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New {offerName} purchase — {buyerEmail}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🟢 New Founder Service purchase</Heading>
        <Text style={lead}>
          A buyer just paid for <strong>{offerName}</strong>. Reach out within 1 business day.
        </Text>
        <Section style={card}>
          <Text style={row}><strong>Offer:</strong> {offerName} ({offerKey})</Text>
          <Text style={row}><strong>Amount:</strong> {amountFormatted}</Text>
          <Text style={row}><strong>Buyer:</strong> {buyerName}</Text>
          <Text style={row}><strong>Email:</strong> {buyerEmail}</Text>
          <Text style={row}><strong>Phone:</strong> {buyerPhone}</Text>
          <Text style={row}><strong>UPLY user ID:</strong> {userId}</Text>
          <Text style={row}><strong>Stripe session:</strong> {stripeSessionId}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: 'New Founder Service purchase — action required',
  displayName: 'Founder offer — team notification',
  previewData: {
    offerName: 'Done-for-you Course Build',
    offerKey: 'done-for-you-course',
    buyerEmail: 'buyer@example.com',
    buyerName: 'Jane Doe',
    buyerPhone: '+1 555 555 0123',
    amountFormatted: '$495.00',
    stripeSessionId: 'cs_test_abc123',
    userId: 'uuid-here',
  },
} satisfies TemplateEntry;

const main = { backgroundColor: '#ffffff', fontFamily: 'Plus Jakarta Sans, Arial, sans-serif', color: '#0A0A0A' };
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' };
const h1 = { fontSize: '22px', fontWeight: 700, margin: '0 0 14px 0', color: '#0A0A0A' };
const lead = { fontSize: '14px', lineHeight: '22px', color: '#333', margin: '0 0 14px 0' };
const card = { backgroundColor: '#F6F6F6', borderRadius: '12px', padding: '16px 18px', margin: '8px 0' };
const row = { fontSize: '14px', lineHeight: '22px', color: '#0A0A0A', margin: '0 0 6px 0' };
