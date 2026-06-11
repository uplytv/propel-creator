import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Plus, Check, X, MessageCircleQuestion, ThumbsUp, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLivePolls, type LivePoll } from '@/hooks/useLivePolls';

interface LivePollOverlayProps {
  streamId: string;
  isHost: boolean;
  userId?: string;
  username?: string;
}

export function LivePollOverlay({ streamId, isHost, userId, username }: LivePollOverlayProps) {
  const {
    activePoll,
    questions,
    userVote,
    createPoll,
    vote,
    endPoll,
    askQuestion,
    upvoteQuestion,
    markAnswered,
  } = useLivePolls(streamId);

  const [showCreator, setShowCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState(60);
  const [showQA, setShowQA] = useState(false);
  const [qaInput, setQaInput] = useState('');

  const handleCreatePoll = () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
    createPoll(pollQuestion, pollOptions.filter(o => o.trim()), pollDuration);
    setPollQuestion('');
    setPollOptions(['', '']);
    setShowCreator(false);
  };

  const handleAskQuestion = () => {
    if (!qaInput.trim() || !userId || !username) return;
    askQuestion(userId, username, qaInput);
    setQaInput('');
  };

  return (
    <>
      {/* Active Poll Overlay (for viewers) */}
      <AnimatePresence>
        {activePoll && activePoll.isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-32 left-3 right-16 z-20"
          >
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-white">POLL</span>
                </div>
                <span className="text-[10px] text-white/50">{activePoll.totalVotes} votes</span>
              </div>
              <p className="text-sm font-semibold text-white">{activePoll.question}</p>
              <div className="space-y-2">
                {activePoll.options.map(option => {
                  const pct = activePoll.totalVotes > 0
                    ? Math.round((option.votes / activePoll.totalVotes) * 100)
                    : 0;
                  const isSelected = userVote === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => !userVote && vote(option.id)}
                      disabled={!!userVote}
                      className="w-full relative rounded-xl overflow-hidden text-left"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                    >
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-xl"
                        style={{ backgroundColor: isSelected ? 'rgba(61, 124, 255,0.25)' : 'rgba(255,255,255,0.08)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5 }}
                      />
                      <div className="relative px-3 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isSelected && <Check className="w-3.5 h-3.5 text-green-400" />}
                          <span className="text-sm text-white font-medium">{option.text}</span>
                        </div>
                        {userVote && (
                          <span className="text-xs font-bold text-white/80">{pct}%</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {isHost && (
                <Button size="sm" variant="ghost" onClick={endPoll} className="w-full text-white/60 text-xs">
                  End Poll
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Host: Poll Creator */}
      {isHost && (
        <>
          <AnimatePresence>
            {showCreator && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 z-40 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                onClick={() => setShowCreator(false)}
              >
                <div
                  className="bg-card rounded-2xl p-5 max-w-sm w-full mx-4 space-y-4"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">Create Poll</h3>
                    <button onClick={() => setShowCreator(false)}>
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <input
                    value={pollQuestion}
                    onChange={e => setPollQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  {pollOptions.map((opt, i) => (
                    <input
                      key={i}
                      value={opt}
                      onChange={e => {
                        const next = [...pollOptions];
                        next[i] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  ))}
                  {pollOptions.length < 4 && (
                    <button
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                    >
                      <Plus className="w-3 h-3" /> Add option
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Duration:</span>
                    <select
                      value={pollDuration}
                      onChange={e => setPollDuration(Number(e.target.value))}
                      className="bg-secondary/50 border border-border rounded-lg px-2 py-1 text-xs text-foreground"
                    >
                      <option value={30}>30s</option>
                      <option value={60}>1m</option>
                      <option value={120}>2m</option>
                      <option value={300}>5m</option>
                    </select>
                  </div>
                  <Button size="sm" onClick={handleCreatePoll} className="w-full">
                    Launch Poll
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Q&A Section (viewer) */}
      <AnimatePresence>
        {showQA && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-32 left-3 right-16 z-20"
          >
            <div
              className="rounded-2xl p-4 max-h-60 overflow-y-auto space-y-3"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircleQuestion className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-white">Q&A</span>
                </div>
                <button onClick={() => setShowQA(false)}>
                  <X className="w-3.5 h-3.5 text-white/50" />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  value={qaInput}
                  onChange={e => setQaInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
                  placeholder="Ask a question..."
                  className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>

              {questions.map(q => (
                <div key={q.id} className="flex items-start gap-2">
                  <button
                    onClick={() => upvoteQuestion(q.id)}
                    className="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <ThumbsUp className="w-3 h-3 text-white/60" />
                    <span className="text-[10px] text-white/80 font-mono">{q.upvotes}</span>
                  </button>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-primary">{q.username}</span>
                    <p className={`text-sm ${q.isAnswered ? 'text-white/40 line-through' : 'text-white/90'}`}>
                      {q.question}
                    </p>
                  </div>
                  {isHost && !q.isAnswered && (
                    <button onClick={() => markAnswered(q.id)} className="p-1">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Return buttons for host to open poll creator / Q&A toggle */}
      <PollQAButtons
        isHost={isHost}
        onCreatePoll={() => setShowCreator(true)}
        onToggleQA={() => setShowQA(!showQA)}
        showQA={showQA}
        hasActivePoll={!!activePoll?.isActive}
      />
    </>
  );
}

function PollQAButtons({
  isHost,
  onCreatePoll,
  onToggleQA,
  showQA,
  hasActivePoll,
}: {
  isHost: boolean;
  onCreatePoll: () => void;
  onToggleQA: () => void;
  showQA: boolean;
  hasActivePoll: boolean;
}) {
  return null; // Buttons are rendered by the parent BroadcastStudio / Stream page
}

export { PollQAButtons };
