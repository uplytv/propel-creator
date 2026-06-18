import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, BookOpen, CalendarDays, GraduationCap } from "lucide-react";
import CourseEnrollSheet from "@/components/payments/CourseEnrollSheet";

interface Course {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  user_id: string;
  creator_name?: string;
  creator_username?: string;
  creator_avatar?: string;
}

/** AI Discover — featured classrooms & courses. Replaces the old "going out /
 *  your plan" social strip at the top of Discover with learning discovery. */
export default function FeaturedLearning() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enrollCourse, setEnrollCourse] = useState<Course | null>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["featured-learning"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, description, price, image_url, user_id")
        .eq("type", "course")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(12);
      const rows = (data ?? []) as Course[];
      const ids = [...new Set(rows.map((r) => r.user_id))];
      let profs: Record<string, { display_name?: string; username?: string; avatar_url?: string }> = {};
      if (ids.length) {
        const { data: p } = await supabase
          .from("profiles_public")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", ids);
        profs = Object.fromEntries((p ?? []).map((x: any) => [x.user_id, x]));
      }
      return rows.map((r) => ({
        ...r,
        creator_name: profs[r.user_id]?.display_name || "Creator",
        creator_username: profs[r.user_id]?.username,
        creator_avatar: profs[r.user_id]?.avatar_url,
      }));
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 pt-3">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] to-[hsl(280_85%_60%)]/[0.04] p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-[hsl(220_100%_62%)] to-[hsl(280_85%_60%)] flex items-center justify-center shrink-0">
              <Sparkles className="w-[18px] h-[18px] text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">AI Discover · Featured Learning</h2>
              <p className="text-xs text-muted-foreground">Classrooms & courses picked for you</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5 rounded-full" onClick={() => navigate("/events/create")}>
              <CalendarDays className="w-4 h-4" /> Create Event
            </Button>
            {user && (
              <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={() => navigate(`/community/${user.id}/classroom`)}>
                <BookOpen className="w-4 h-4" /> Add Course
              </Button>
            )}
          </div>
        </div>

        {/* Courses */}
        {isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-44 shrink-0 h-44 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-8">
            <GraduationCap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No featured courses yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">Be the first to teach what you know.</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {courses.map((c) => (
              <button
                key={c.id}
                onClick={() => setEnrollCourse(c)}
                className="w-44 shrink-0 text-left rounded-xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-colors"
              >
                <div className="aspect-video bg-muted relative">
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-[hsl(280_85%_60%)]/10">
                      <BookOpen className="w-7 h-7 text-primary/60" />
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white tracking-wide">COURSE</span>
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{c.creator_name}</p>
                  <p className="text-xs font-bold text-primary mt-1">{Number(c.price) > 0 ? `$${Number(c.price).toFixed(0)}` : "Free"}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Proper enroll/buy flow — opens course details + checkout */}
      {enrollCourse && (
        <CourseEnrollSheet
          open={!!enrollCourse}
          onClose={() => setEnrollCourse(null)}
          product={{
            id: enrollCourse.id,
            name: enrollCourse.name,
            description: enrollCourse.description ?? undefined,
            price: enrollCourse.price,
            image_url: enrollCourse.image_url ?? undefined,
            user_id: enrollCourse.user_id,
          }}
          creatorName={enrollCourse.creator_name}
          creatorAvatar={enrollCourse.creator_avatar}
          creatorUsername={enrollCourse.creator_username}
        />
      )}
    </div>
  );
}
