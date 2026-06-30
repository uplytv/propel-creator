/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPLY'

interface Props {
  name?: string
  entryTitle?: string
  challengeTitle?: string
  status: 'approved' | 'rejected'
  notes?: string
  leaderboardUrl?: string
  submitUrl?: string
}

const CompetitionEntryStatusEmail = ({
  name,
  entryTitle,
  challengeTitle,
  status,
  notes,
  leaderboardUrl,
  submitUrl,
}: Props) => {
  const approved = status === 'approved'
  const headline = approved
    ? `You're in! 🎉`
    : `Update on your submission`
  const preview = approved
    ? `Your entry${entryTitle ? ` "${entryTitle}"` : ''} is now live for voting`
    : `Your entry${entryTitle ? ` "${entryTitle}"` : ''} wasn't approved`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>⚡ {SITE_NAME}</Text>
          </Section>
          <Heading style={h1}>
            {name ? `Hi ${name},` : 'Hi there,'}
          </Heading>
          <Heading style={h2}>{headline}</Heading>
          <Text style={text}>
            {approved ? (
              <>
                Great news — your entry
                {entryTitle ? <> <strong>"{entryTitle}"</strong></> : ''}
                {challengeTitle ? <> in <strong>{challengeTitle}</strong></> : ''} has been
                approved and is now live on the leaderboard. Fans can start voting right now.
              </>
            ) : (
              <>
                Thanks for submitting
                {entryTitle ? <> <strong>"{entryTitle}"</strong></> : ' your entry'}
                {challengeTitle ? <> to <strong>{challengeTitle}</strong></> : ''}. After review,
                our team wasn't able to approve this entry for the public leaderboard.
              </>
            )}
          </Text>

          {notes && (
            <Section style={notesBox}>
              <Text style={notesLabel}>A note from our team</Text>
              <Text style={notesText}>{notes}</Text>
            </Section>
          )}

          <Section style={ctaSection}>
            {approved && leaderboardUrl ? (
              <Button style={button} href={leaderboardUrl}>View the leaderboard</Button>
            ) : !approved && submitUrl ? (
              <Button style={button} href={submitUrl}>Submit a new entry</Button>
            ) : null}
          </Section>

          <Hr style={hr} />
          {approved ? (
            <>
              <Text style={subtext}>What you can do now:</Text>
              <Text style={listItem}>🔗 Share your entry link to rally votes</Text>
              <Text style={listItem}>⭐ Super Votes give a bigger boost to your score</Text>
              <Text style={listItem}>🏆 Climb the leaderboard before the final round</Text>
            </>
          ) : (
            <Text style={text}>
              You're welcome to try again with a new submission. If you think this was a
              mistake, just reply to this email and we'll take another look.
            </Text>
          )}

          <Hr style={hr} />
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CompetitionEntryStatusEmail,
  subject: (data: Record<string, any>) =>
    data?.status === 'approved'
      ? `🎉 Your entry is live${data?.entryTitle ? `: ${data.entryTitle}` : ''}`
      : `Update on your submission${data?.entryTitle ? `: ${data.entryTitle}` : ''}`,
  displayName: 'Competition entry status update',
  previewData: {
    name: 'Sam',
    entryTitle: 'Midnight Run',
    challengeTitle: 'Omid Global Talent Search',
    status: 'approved',
    leaderboardUrl: 'https://uply.tv/omid/competition',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', 'Space Grotesk', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logoText = { fontSize: '28px', fontWeight: 'bold' as const, color: '#000000', letterSpacing: '-0.5px' }
const h1 = { fontSize: '18px', fontWeight: '600' as const, color: '#000000', margin: '0 0 4px', lineHeight: '1.3' }
const h2 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const subtext = { fontSize: '14px', color: '#333333', fontWeight: '600' as const, margin: '0 0 12px' }
const listItem = { fontSize: '14px', color: '#55575d', lineHeight: '1.8', margin: '0', paddingLeft: '4px' }
const ctaSection = { textAlign: 'center' as const, margin: '8px 0 24px' }
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
const notesBox = {
  backgroundColor: '#f7f7f7',
  borderLeft: '3px solid #00FF85',
  padding: '12px 16px',
  borderRadius: '6px',
  margin: '0 0 24px',
}
const notesLabel = { fontSize: '12px', color: '#999999', fontWeight: '600' as const, margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const notesText = { fontSize: '14px', color: '#333333', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' as const }
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '4px 0', lineHeight: '1.5' }
