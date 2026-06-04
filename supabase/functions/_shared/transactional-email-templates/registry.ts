/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcomeEmail } from './welcome-email.tsx'
import { template as digitalProductReceipt } from './digital-product-receipt.tsx'
import { template as betaAccessGranted } from './beta-access-granted.tsx'
import { template as ticketConfirmation } from './ticket-confirmation.tsx'
import { template as applicationConfirmation } from './application-confirmation.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome-email': welcomeEmail,
  'digital-product-receipt': digitalProductReceipt,
  'beta-access-granted': betaAccessGranted,
  'ticket-confirmation': ticketConfirmation,
  'music-track-ready': musicTrackReady,
}
