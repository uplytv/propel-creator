import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface LivePoll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  isActive: boolean;
  createdAt: number;
  endsAt: number | null;
}

export interface QAQuestion {
  id: string;
  userId: string;
  username: string;
  question: string;
  upvotes: number;
  isAnswered: boolean;
  createdAt: number;
}

/**
 * Live polls and Q&A for streams.
 * Uses Supabase Realtime broadcast for instant synchronization.
 */
export function useLivePolls(streamId: string | undefined) {
  const [activePoll, setActivePoll] = useState<LivePoll | null>(null);
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [userVote, setUserVote] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!streamId) return;

    const channel = supabase.channel(`polls-${streamId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'poll-created' }, (payload: any) => {
        setActivePoll(payload.payload.poll);
        setUserVote(null);
      })
      .on('broadcast', { event: 'poll-vote' }, (payload: any) => {
        const { optionId } = payload.payload;
        setActivePoll(prev => {
          if (!prev) return null;
          return {
            ...prev,
            options: prev.options.map(o =>
              o.id === optionId ? { ...o, votes: o.votes + 1 } : o
            ),
            totalVotes: prev.totalVotes + 1,
          };
        });
      })
      .on('broadcast', { event: 'poll-ended' }, () => {
        setActivePoll(prev => prev ? { ...prev, isActive: false } : null);
      })
      .on('broadcast', { event: 'qa-question' }, (payload: any) => {
        setQuestions(prev => [...prev, payload.payload.question]);
      })
      .on('broadcast', { event: 'qa-upvote' }, (payload: any) => {
        const { questionId } = payload.payload;
        setQuestions(prev =>
          prev.map(q => q.id === questionId ? { ...q, upvotes: q.upvotes + 1 } : q)
        );
      })
      .on('broadcast', { event: 'qa-answered' }, (payload: any) => {
        const { questionId } = payload.payload;
        setQuestions(prev =>
          prev.map(q => q.id === questionId ? { ...q, isAnswered: true } : q)
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  // Host: create a poll
  const createPoll = useCallback((question: string, options: string[], durationSeconds?: number) => {
    if (!channelRef.current) return;
    const poll: LivePoll = {
      id: crypto.randomUUID(),
      question,
      options: options.map(text => ({
        id: crypto.randomUUID(),
        text,
        votes: 0,
      })),
      totalVotes: 0,
      isActive: true,
      createdAt: Date.now(),
      endsAt: durationSeconds ? Date.now() + durationSeconds * 1000 : null,
    };
    setActivePoll(poll);
    setUserVote(null);
    channelRef.current.send({
      type: 'broadcast',
      event: 'poll-created',
      payload: { poll },
    });

    // Auto-end poll after duration
    if (durationSeconds) {
      setTimeout(() => endPoll(), durationSeconds * 1000);
    }
  }, []);

  // Viewer: vote on a poll
  const vote = useCallback((optionId: string) => {
    if (!channelRef.current || userVote) return;
    setUserVote(optionId);
    // Update locally immediately
    setActivePoll(prev => {
      if (!prev) return null;
      return {
        ...prev,
        options: prev.options.map(o =>
          o.id === optionId ? { ...o, votes: o.votes + 1 } : o
        ),
        totalVotes: prev.totalVotes + 1,
      };
    });
    channelRef.current.send({
      type: 'broadcast',
      event: 'poll-vote',
      payload: { optionId },
    });
  }, [userVote]);

  // Host: end poll
  const endPoll = useCallback(() => {
    if (!channelRef.current) return;
    setActivePoll(prev => prev ? { ...prev, isActive: false } : null);
    channelRef.current.send({
      type: 'broadcast',
      event: 'poll-ended',
      payload: {},
    });
  }, []);

  // Viewer: ask a question
  const askQuestion = useCallback((userId: string, username: string, question: string) => {
    if (!channelRef.current) return;
    const q: QAQuestion = {
      id: crypto.randomUUID(),
      userId,
      username,
      question,
      upvotes: 0,
      isAnswered: false,
      createdAt: Date.now(),
    };
    setQuestions(prev => [...prev, q]);
    channelRef.current.send({
      type: 'broadcast',
      event: 'qa-question',
      payload: { question: q },
    });
  }, []);

  // Viewer: upvote a question
  const upvoteQuestion = useCallback((questionId: string) => {
    if (!channelRef.current) return;
    setQuestions(prev =>
      prev.map(q => q.id === questionId ? { ...q, upvotes: q.upvotes + 1 } : q)
    );
    channelRef.current.send({
      type: 'broadcast',
      event: 'qa-upvote',
      payload: { questionId },
    });
  }, []);

  // Host: mark question as answered
  const markAnswered = useCallback((questionId: string) => {
    if (!channelRef.current) return;
    setQuestions(prev =>
      prev.map(q => q.id === questionId ? { ...q, isAnswered: true } : q)
    );
    channelRef.current.send({
      type: 'broadcast',
      event: 'qa-answered',
      payload: { questionId },
    });
  }, []);

  return {
    activePoll,
    questions: questions.sort((a, b) => b.upvotes - a.upvotes),
    userVote,
    createPoll,
    vote,
    endPoll,
    askQuestion,
    upvoteQuestion,
    markAnswered,
  };
}
