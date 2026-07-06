import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSendTip } from '../hooks/useMusicMonetization';
import { toast } from 'sonner';

const PRESETS = [1, 5, 10, 25];

interface Props {
  artistId: string;
  trackId?: string;
  artistName?: string;
}

export function TipArtistButton({ artistId, trackId, artistName }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(5);
  const [message, setMessage] = useState('');
  const sendTip = useSendTip();

  const submit = async () => {
    if (amount < 1) {
      toast.error('Minimum tip is $1');
      return;
    }
    try {
      // Real payment: redirects to Stripe Checkout. The tip is only recorded
      // (and the artist only paid) after the payment succeeds.
      const { url } = await sendTip.mutateAsync({
        artist_id: artistId,
        track_id: trackId,
        amount_cents: Math.round(amount * 100),
        message: message.trim() || undefined,
      });
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message ?? 'Could not start checkout');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full min-h-[44px]">
          <Heart className="w-4 h-4 mr-2 text-primary" />
          Tip
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Tip {artistName ?? 'artist'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p}
                variant={amount === p ? 'default' : 'outline'}
                onClick={() => setAmount(p)}
                className="min-h-[44px]"
              >
                ${p}
              </Button>
            ))}
          </div>
          <Input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Custom amount"
            className="text-base"
          />
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message (optional)"
            rows={3}
          />
          <Button onClick={submit} disabled={sendTip.isPending} className="w-full min-h-[44px]">
            {sendTip.isPending ? 'Opening checkout…' : `Send $${amount}`}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">
            Paid securely via Stripe · 5% platform fee
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
