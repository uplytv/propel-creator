import { useState, useEffect } from 'react';
import { useMyVerificationApplication, useSubmitVerificationApplication } from '../hooks/useArtistVerification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { toast } from 'sonner';
import { BadgeCheck, Clock, XCircle } from 'lucide-react';

export default function ArtistVerificationPage() {
  const { data: app, isLoading } = useMyVerificationApplication();
  const submit = useSubmitVerificationApplication();

  const [legalName, setLegalName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [primaryLink, setPrimaryLink] = useState('');
  const [spotify, setSpotify] = useState('');
  const [instagram, setInstagram] = useState('');
  const [evidence, setEvidence] = useState('');
  const [monthlyListeners, setMonthlyListeners] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (app) {
      setLegalName(app.legal_name);
      setArtistName(app.artist_name);
      setPrimaryLink(app.primary_link ?? '');
      setSpotify((app.social_links as any)?.spotify ?? '');
      setInstagram((app.social_links as any)?.instagram ?? '');
      setEvidence((app.evidence_urls ?? []).join('\n'));
      setMonthlyListeners(app.monthly_listeners?.toString() ?? '');
      setReason(app.reason ?? '');
    }
  }, [app]);

  const isPending = app?.status === 'pending';
  const isApproved = app?.status === 'approved';
  const isRejected = app?.status === 'rejected';
  const canSubmit = !app || isRejected;

  const handleSubmit = async () => {
    if (!legalName.trim() || !artistName.trim()) {
      toast.error('Legal name and artist name required');
      return;
    }
    try {
      await submit.mutateAsync({
        legal_name: legalName.trim(),
        artist_name: artistName.trim(),
        primary_link: primaryLink.trim() || null,
        social_links: { spotify: spotify.trim(), instagram: instagram.trim() },
        evidence_urls: evidence.split('\n').map((s) => s.trim()).filter(Boolean),
        monthly_listeners: monthlyListeners ? parseInt(monthlyListeners) : null,
        reason: reason.trim() || null,
      });
      toast.success('Verification application submitted');
    } catch (e: any) {
      toast.error(e.message ?? 'Submission failed');
    }
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6 mobile-safe-content">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <BadgeCheck className="text-primary" />
          <h1 className="text-2xl font-bold">Artist Verification</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Get the verified badge <VerifiedBadge /> on your artist profile to confirm authenticity to fans.
        </p>
      </header>

      {app && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {isApproved && <BadgeCheck className="text-primary" size={18} />}
              {isPending && <Clock className="text-yellow-500" size={18} />}
              {isRejected && <XCircle className="text-destructive" size={18} />}
              Status
              <Badge
                variant={isApproved ? 'default' : isRejected ? 'destructive' : 'secondary'}
                className="ml-auto capitalize"
              >
                {app.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          {app.admin_notes && (
            <CardContent className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Reviewer notes</p>
              {app.admin_notes}
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="legal">Legal name</Label>
            <Input id="legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} disabled={!canSubmit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artist">Artist / stage name</Label>
            <Input id="artist" value={artistName} onChange={(e) => setArtistName(e.target.value)} disabled={!canSubmit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link">Primary website / link</Label>
            <Input id="link" placeholder="https://" value={primaryLink} onChange={(e) => setPrimaryLink(e.target.value)} disabled={!canSubmit} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="spotify">Spotify URL</Label>
              <Input id="spotify" value={spotify} onChange={(e) => setSpotify(e.target.value)} disabled={!canSubmit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ig">Instagram URL</Label>
              <Input id="ig" value={instagram} onChange={(e) => setInstagram(e.target.value)} disabled={!canSubmit} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="listeners">Monthly listeners (optional)</Label>
            <Input
              id="listeners"
              type="number"
              inputMode="numeric"
              value={monthlyListeners}
              onChange={(e) => setMonthlyListeners(e.target.value)}
              disabled={!canSubmit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="evidence">Evidence URLs (one per line)</Label>
            <Textarea
              id="evidence"
              rows={4}
              placeholder="Press articles, official label page, etc."
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              disabled={!canSubmit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Why you should be verified</Label>
            <Textarea
              id="reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!canSubmit}
            />
          </div>

          {canSubmit && (
            <Button onClick={handleSubmit} disabled={submit.isPending} className="w-full">
              {submit.isPending ? 'Submitting…' : isRejected ? 'Resubmit application' : 'Submit application'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
