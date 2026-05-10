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

interface Props {
  trackTitle?: string
  trackUrl?: string
  username?: string
}

const MusicTrackReady = ({
  trackTitle = 'Your track',
  trackUrl = 'https://uply.tv/music',
  username = 'your-page',
}: Props) => (
  <Html>
    <Head />
    <Preview>{trackTitle} is live on uply</Preview>
    <Body style={{ backgroundColor: '#0A0A0A', fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#fff', margin: 0, padding: 0 }}>
      <Container style={{ maxWidth: 560, margin: '0 auto', padding: 32 }}>
        <Heading style={{ fontSize: 28, margin: '0 0 8px', background: 'linear-gradient(90deg,#3D7CFF,#B025FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          your track is live 🎧
        </Heading>
        <Text style={{ color: '#A1A1AA', fontSize: 14, marginTop: 0 }}>
          uply finished processing <strong style={{ color: '#fff' }}>{trackTitle}</strong>. it's
          ready to stream.
        </Text>
        <Section style={{ marginTop: 24 }}>
          <Button
            href={trackUrl}
            style={{
              background: 'linear-gradient(90deg,#3D7CFF,#B025FF)',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 999,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            open the track
          </Button>
        </Section>
        <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 32 }}>
          shareable: uply.tv/{username}/music
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MusicTrackReady,
  subject: (d: Record<string, any>) =>
    `${d?.trackTitle || 'your track'} is live on uply 🎧`,
  displayName: 'Music — Track Ready',
  previewData: {
    trackTitle: 'Midnight Drive',
    trackUrl: 'https://uply.tv/music/track/demo',
    username: 'demo',
  },
}
