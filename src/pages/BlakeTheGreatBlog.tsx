import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import portraitAsset from "@/assets/blake-portrait.jpg.asset.json";
import portfolioAsset from "@/assets/blake-portfolio.jpg";
import betAsset from "@/assets/blake-bet-win.jpg";
import tradingAsset from "@/assets/blake-trading-desk.jpg";
import lifestyleAsset from "@/assets/blake-lifestyle.jpg";
import BackButton from "@/components/common/BackButton";

export default function BlakeTheGreatBlog() {
  useEffect(() => {
    document.title = "$70K → $500K in 40 Days — Blake The Great";
    const meta = document.querySelector('meta[name="description"]');
    if (meta)
      meta.setAttribute(
        "content",
        "How Blake turned $70,000 into over half a million dollars in under 40 days — the trades, the bets, and the rules behind the run.",
      );
  }, []);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white pb-24">
      <BackButton />

      <article className="max-w-2xl mx-auto px-6 pt-14">
        <div className="flex items-center gap-3 text-xs text-white/50 mb-4">
          <span className="px-2 py-0.5 rounded-full bg-[#00FF85]/15 text-[#00FF85] font-semibold uppercase tracking-wider">
            Feature
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" /> July 2026
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> 6 min read
          </span>
        </div>

        <h1 className="font-display font-bold text-3xl md:text-5xl leading-tight tracking-tight">
          $70,000 to half a million in{" "}
          <span className="text-[#00FF85]">40 days</span>.
        </h1>
        <p className="mt-4 text-lg text-white/70 leading-relaxed">
          The story of the run that put Blake The Great on the map — every
          entry, every parlay, and the three rules he never broke.
        </p>

        <div className="mt-6 flex items-center gap-3 pb-6 border-b border-white/10">
          <img
            src={portraitAsset.url}
            alt="Blake"
            className="h-12 w-12 rounded-full object-cover ring-1 ring-white/20"
          />
          <div>
            <div className="text-sm font-semibold">Blake The Great</div>
            <div className="text-xs text-white/50">
              California · Trader & Sports Bettor
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl overflow-hidden border border-white/10">
          <img
            src={lifestyleAsset}
            alt="Range Rover at night"
            className="w-full h-auto"
          />
        </div>

        <div className="prose prose-invert max-w-none mt-8 space-y-5 text-white/85 leading-relaxed">
          <p>
            On the first Tuesday of the run, Blake sat down with $70,000 in his
            brokerage and a spreadsheet full of scenarios. Thirty-eight trading
            days later, that same account crossed{" "}
            <strong className="text-white">$512,847</strong>. He didn't hit a
            meme stock. He didn't get lucky on one call. He ran a system.
          </p>

          <h2 className="font-display text-2xl font-bold text-white pt-4">
            Rule one: the market pays patience.
          </h2>
          <p>
            "I probably said no to 40 setups for every one I took," Blake says
            over a black coffee in his home office overlooking the palms. "You
            don't need a lot of trades. You need a few great ones and the
            discipline to size them right."
          </p>

          <div className="rounded-2xl overflow-hidden border border-white/10 my-6">
            <img
              src={portfolioAsset}
              alt="Portfolio screenshot"
              className="w-full h-auto"
            />
          </div>

          <p>
            The first big move was a NVDA earnings play — full conviction, sized
            to 40% of the book. It printed 3x on calls in 48 hours. He rolled
            the profits into a Tesla momentum swing the next week. Same story.
          </p>

          <h2 className="font-display text-2xl font-bold text-white pt-4">
            Rule two: sports bets fund the risk.
          </h2>
          <p>
            While the swing trades cooked, Blake kept the sportsbook running.
            His model — a mix of injury data, line-shopping, and gut he refuses
            to fully explain — hit a{" "}
            <strong className="text-white">72% strike rate</strong> across NBA
            playoffs and MLB regular season.
          </p>

          <div className="rounded-2xl overflow-hidden border border-white/10 my-6">
            <img
              src={betAsset}
              alt="Winning sports bet"
              className="w-full h-auto"
            />
          </div>

          <p>
            One Saturday parlay cleared <strong>$87,420</strong> off a $2,100
            wager. "That was the day I knew I had to open the room," he says.
            "People were DMing me screenshots of their own tickets from my picks
            and I was leaving money on the table by not sharing it publicly."
          </p>

          <h2 className="font-display text-2xl font-bold text-white pt-4">
            Rule three: the exit is the trade.
          </h2>
          <p>
            The move most retail traders miss isn't the entry — it's knowing
            when to walk. Blake pulled the account back to cash on day 39, one
            day before a Fed decision that would've unwound half his book.
          </p>

          <div className="rounded-2xl overflow-hidden border border-white/10 my-6">
            <img
              src={tradingAsset}
              alt="Trading desk at night"
              className="w-full h-auto"
            />
          </div>

          <p>
            "Winners take profits. Legends take profits early." He grins. "I'm
            trying to be a legend."
          </p>

          <h2 className="font-display text-2xl font-bold text-white pt-4">
            What's next.
          </h2>
          <p>
            Blake just opened <em>The Blueprint</em> — a $97/month room where he
            posts every trade and every bet as he takes them, hosts weekly live
            sessions, and reviews members' portfolios one-on-one.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border-2 border-[#00FF85]/40 bg-[#00FF85]/[0.05] p-6 text-center">
          <div className="text-xs uppercase tracking-[0.25em] text-[#00FF85] mb-2">
            Ready to run with Blake?
          </div>
          <div className="font-display text-2xl font-bold mb-3">
            Join The Blueprint — $97/mo
          </div>
          <Link
            to="/blake-the-great/course"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-xl font-semibold bg-[#00FF85] text-black hover:bg-[#00FF85]/90 transition"
          >
            Get instant access <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 text-center">
          <Link to="/blake" className="text-sm text-white/50 hover:text-white">
            ← Back to Blake's profile
          </Link>
        </div>
      </article>
    </main>
  );
}
