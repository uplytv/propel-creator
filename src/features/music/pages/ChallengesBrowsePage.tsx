import { useState } from 'react';
import { useChallenges } from '../hooks/useChallenges';
import { ChallengeCard } from '../components/ChallengeCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Trophy, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function ChallengesBrowsePage() {
  const [status, setStatus] = useState<'active' | 'judging' | 'completed'>('active');
  const { data: challenges = [], isLoading } = useChallenges(status);

  return (
    <div className="container max-w-5xl mx-auto p-4 space-y-4 mobile-safe-content">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="text-primary" />
          <h1 className="text-2xl font-bold">Remix Challenges</h1>
        </div>
        <Button size="sm" asChild>
          <Link to="/music/challenges/new">
            <Plus size={16} className="mr-1" />
            Host
          </Link>
        </Button>
      </header>

      <Tabs value={status} onValueChange={(v) => setStatus(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
          <TabsTrigger value="judging" className="flex-1">Judging</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={status} className="mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : challenges.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No {status} challenges yet.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {challenges.map((c: any) => (
                <ChallengeCard key={c.id} challenge={c} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
