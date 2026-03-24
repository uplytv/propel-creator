import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface LiveAuction {
  id: string;
  itemName: string;
  itemDescription: string;
  imageUrl?: string;
  startingBid: number;
  currentBid: number;
  currentBidderId: string | null;
  currentBidderName: string | null;
  bidCount: number;
  status: 'pending' | 'active' | 'ending' | 'sold' | 'cancelled';
  endsAt: number;
  createdAt: number;
}

export function useLiveAuction(streamId: string, isHost: boolean) {
  const { user } = useAuth();
  const [auction, setAuction] = useState<LiveAuction | null>(null);
  const [bidHistory, setBidHistory] = useState<Array<{ name: string; amount: number; time: number }>>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`auction-${streamId}`)
      .on('broadcast', { event: 'auction_update' }, ({ payload }) => {
        if (payload?.auction) setAuction(payload.auction);
        if (payload?.bid) setBidHistory(prev => [payload.bid, ...prev].slice(0, 50));
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  const createAuction = useCallback(async (
    itemName: string,
    itemDescription: string,
    startingBid: number,
    durationSeconds: number = 120,
    imageUrl?: string,
  ) => {
    const newAuction: LiveAuction = {
      id: `auction-${Date.now()}`,
      itemName,
      itemDescription,
      imageUrl,
      startingBid,
      currentBid: startingBid,
      currentBidderId: null,
      currentBidderName: null,
      bidCount: 0,
      status: 'active',
      endsAt: Date.now() + durationSeconds * 1000,
      createdAt: Date.now(),
    };

    setAuction(newAuction);
    setBidHistory([]);

    await channelRef.current?.send({
      type: 'broadcast',
      event: 'auction_update',
      payload: { auction: newAuction },
    });

    // Auto-end after duration
    setTimeout(() => {
      setAuction(prev => {
        if (!prev || prev.id !== newAuction.id) return prev;
        const ended = { ...prev, status: 'sold' as const };
        channelRef.current?.send({
          type: 'broadcast',
          event: 'auction_update',
          payload: { auction: ended },
        });
        return ended;
      });
    }, durationSeconds * 1000);
  }, []);

  const placeBid = useCallback(async (amount: number) => {
    if (!user || !auction || auction.status !== 'active') return;
    if (amount <= auction.currentBid) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    const bidderName = profile?.display_name || 'Anonymous';

    const updated: LiveAuction = {
      ...auction,
      currentBid: amount,
      currentBidderId: user.id,
      currentBidderName: bidderName,
      bidCount: auction.bidCount + 1,
    };

    // Extend auction by 15s if within last 30s (anti-snipe)
    const remaining = updated.endsAt - Date.now();
    if (remaining < 30000) {
      updated.endsAt = Date.now() + 30000;
    }

    setAuction(updated);
    const bid = { name: bidderName, amount, time: Date.now() };
    setBidHistory(prev => [bid, ...prev].slice(0, 50));

    await channelRef.current?.send({
      type: 'broadcast',
      event: 'auction_update',
      payload: { auction: updated, bid },
    });
  }, [user, auction]);

  const endAuction = useCallback(async () => {
    if (!auction) return;
    const ended = { ...auction, status: 'sold' as const };
    setAuction(ended);
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'auction_update',
      payload: { auction: ended },
    });
  }, [auction]);

  const cancelAuction = useCallback(async () => {
    if (!auction) return;
    const cancelled = { ...auction, status: 'cancelled' as const };
    setAuction(cancelled);
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'auction_update',
      payload: { auction: cancelled },
    });
  }, [auction]);

  return { auction, bidHistory, createAuction, placeBid, endAuction, cancelAuction };
}
