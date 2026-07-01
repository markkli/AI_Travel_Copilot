import { useState } from "react";
import { Heart, Bookmark, Share2, MapPin, Calendar, Clock } from "lucide-react";

type TravelPost = {
  id: string;
  author: { name: string; initials: string; avatarColor: string };
  title: string;
  destination: string;
  dates: string;
  duration: number;
  excerpt: string;
  tags: string[];
  budget: string;
  likes: number;
  saves: number;
  gradient: string;
  accentColor: string;
};

const MOCK_POSTS: TravelPost[] = [
  {
    id: "1",
    author: { name: "Sarah K.", initials: "SK", avatarColor: "bg-indigo-500" },
    title: "7 Days Chasing Autumn in Vermont",
    destination: "Vermont, USA",
    dates: "Oct 3 – Oct 10",
    duration: 7,
    excerpt: "The leaves hit absolute peak color the morning we arrived in Stowe. Winding back roads through covered bridges, cider donuts at every farm stand, and watching the whole valley turn orange from the summit of Camel's Hump. This is the one trip I'd repeat every single year.",
    tags: ["fall foliage", "scenic drives", "photography", "small towns"],
    budget: "medium",
    likes: 234,
    saves: 89,
    gradient: "from-orange-900 via-red-900 to-amber-950",
    accentColor: "text-orange-300",
  },
  {
    id: "2",
    author: { name: "Marco T.", initials: "MT", avatarColor: "bg-sky-600" },
    title: "Iceland Ring Road in 10 Days",
    destination: "Iceland",
    dates: "Sep 12 – Sep 22",
    duration: 10,
    excerpt: "We almost gave up on the Northern Lights by day 6, then on night 7 the entire sky turned green. The Ring Road rewards patience. Waterfalls at Skógafoss, the black sand at Reynisfjara, reindeer crossing the road in the East Fjords — each day felt like a different planet.",
    tags: ["northern lights", "waterfalls", "road trip", "wildlife"],
    budget: "high",
    likes: 512,
    saves: 203,
    gradient: "from-slate-900 via-blue-950 to-indigo-950",
    accentColor: "text-sky-300",
  },
  {
    id: "3",
    author: { name: "Yuki M.", initials: "YM", avatarColor: "bg-pink-500" },
    title: "Tokyo Hidden Neighborhoods",
    destination: "Tokyo, Japan",
    dates: "Apr 1 – Apr 8",
    duration: 7,
    excerpt: "Skip Shibuya and Shinjuku for a day and get lost in Yanaka, Shimokitazawa, and Koenji. Old wooden temples next to vintage record shops, kissaten coffee bars frozen in 1975, cherry blossoms dropping petals into tiny canals. Nobody ever talks about this side of Tokyo.",
    tags: ["culture", "local food", "hidden gems", "walkable"],
    budget: "medium",
    likes: 389,
    saves: 156,
    gradient: "from-purple-950 via-fuchsia-950 to-rose-950",
    accentColor: "text-pink-300",
  },
  {
    id: "4",
    author: { name: "Derek R.", initials: "DR", avatarColor: "bg-forest-600" },
    title: "Grand Teton Photography Trip",
    destination: "Wyoming, USA",
    dates: "Aug 20 – Aug 27",
    duration: 7,
    excerpt: "Woke up at 4am four days straight for the Oxbow Bend sunrise. Every single time worth it. The air at 6,000ft in August is clean like nothing else. Bring a 600mm if you want the moose shots — they're out every single morning along the Snake River.",
    tags: ["photography", "wildlife", "mountains", "nature"],
    budget: "medium",
    likes: 198,
    saves: 94,
    gradient: "from-forest-950 via-forest-900 to-forest-800",
    accentColor: "text-forest-300",
  },
  {
    id: "5",
    author: { name: "Chiara B.", initials: "CB", avatarColor: "bg-teal-500" },
    title: "Amalfi Coast Without a Car",
    destination: "Campania, Italy",
    dates: "Jun 6 – Jun 13",
    duration: 8,
    excerpt: "Everyone rents scooters or gets stuck in traffic. We took the ferries and the hiking paths. The Sentiero degli Dei (Path of the Gods) from Agerola to Positano is 6 miles of zero crowds and continuous views. Positano at 7am before the boats arrive is a different city entirely.",
    tags: ["hiking", "coastal", "ferry", "local food"],
    budget: "high",
    likes: 445,
    saves: 171,
    gradient: "from-teal-950 via-cyan-950 to-blue-950",
    accentColor: "text-teal-300",
  },
  {
    id: "6",
    author: { name: "Priya S.", initials: "PS", avatarColor: "bg-amber-500" },
    title: "New Mexico: Desert, Stars & Pueblos",
    destination: "New Mexico, USA",
    dates: "Oct 15 – Oct 21",
    duration: 6,
    excerpt: "Taos Pueblo, the Bisti Badlands, and White Sands in the same week. I shot the Milky Way core from the dunes at midnight — the sand glows blue-white under the stars. The whole state feels like Mars with better food and better pottery. Absolutely not enough people know about this.",
    tags: ["astrophotography", "desert", "culture", "photography"],
    budget: "low",
    likes: 276,
    saves: 118,
    gradient: "from-orange-950 via-red-950 to-stone-900",
    accentColor: "text-orange-300",
  },
];

export default function CommunityPage() {
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  function toggleLike(id: string) {
    setLikedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function toggleSave(id: string) {
    setSavedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-forest-900 text-forest-900 dark:text-cream-100 transition-colors pt-16">
      {/* Page header */}
      <div className="border-b border-cream-200 dark:border-forest-800 bg-cream-50 dark:bg-forest-950 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-500">
            From the community
          </p>
          <h1 className="mb-3 font-serif text-4xl font-bold text-forest-900 dark:text-cream-50 md:text-5xl">
            Travel notes
          </h1>
          <p className="max-w-xl text-base text-forest-600 dark:text-forest-300">
            Real trip stories from real travelers. Every post was planned with AI Travel Copilot — click any one to remix it as your own.
          </p>

          <div className="mt-6">
            <button
              type="button"
              disabled
              title="Share your generated trip to post here"
              className="rounded-full bg-gold-500 px-6 py-2.5 text-sm font-semibold text-forest-950 opacity-60 cursor-not-allowed"
            >
              Share a trip (coming soon)
            </button>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {MOCK_POSTS.map((post, i) => (
            <article
              key={post.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-cream-200 dark:border-forest-700 bg-white dark:bg-forest-800 shadow-sm transition-shadow hover:shadow-md dark:hover:shadow-black/30 animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Photo / gradient header */}
              <div className={`relative h-44 bg-gradient-to-br ${post.gradient} overflow-hidden flex-shrink-0`}>
                {/* Overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08)_0%,transparent_60%)]" />

                {/* Destination + dates */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <div className="flex items-center gap-1.5 text-white/80 text-xs">
                    <MapPin className="h-3 w-3" />
                    <span>{post.destination}</span>
                    <span className="text-white/40">·</span>
                    <Calendar className="h-3 w-3" />
                    <span>{post.dates}</span>
                  </div>
                </div>

                {/* Duration badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/30 backdrop-blur-sm px-2 py-1 text-white/80 text-xs">
                  <Clock className="h-3 w-3" />
                  {post.duration}d
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-5">
                {/* Author */}
                <div className="mb-3 flex items-center gap-2.5">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${post.author.avatarColor} text-white text-xs font-semibold flex-shrink-0`}>
                    {post.author.initials}
                  </div>
                  <span className="text-sm font-medium text-forest-700 dark:text-forest-300">{post.author.name}</span>
                </div>

                {/* Title */}
                <h3 className="mb-2 font-serif text-lg font-semibold leading-snug text-forest-900 dark:text-cream-100">
                  {post.title}
                </h3>

                {/* Excerpt */}
                <p className="mb-4 flex-1 text-sm leading-relaxed text-forest-600 dark:text-forest-300 line-clamp-4">
                  {post.excerpt}
                </p>

                {/* Tags */}
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-cream-100 dark:bg-forest-700 px-2.5 py-0.5 text-xs text-forest-600 dark:text-forest-300">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-cream-100 dark:border-forest-700 pt-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => toggleLike(post.id)}
                      className="flex items-center gap-1.5 text-xs text-forest-500 dark:text-forest-400 transition-colors hover:text-red-500 cursor-pointer"
                    >
                      <Heart
                        className={`h-4 w-4 transition-colors ${likedIds.has(post.id) ? "fill-red-500 text-red-500" : ""}`}
                      />
                      {post.likes + (likedIds.has(post.id) ? 1 : 0)}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSave(post.id)}
                      className="flex items-center gap-1.5 text-xs text-forest-500 dark:text-forest-400 transition-colors hover:text-gold-500 cursor-pointer"
                    >
                      <Bookmark
                        className={`h-4 w-4 transition-colors ${savedIds.has(post.id) ? "fill-gold-500 text-gold-500" : ""}`}
                      />
                      {post.saves + (savedIds.has(post.id) ? 1 : 0)}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-full bg-cream-100 dark:bg-forest-700 px-3 py-1.5 text-xs font-medium text-forest-600 dark:text-forest-300 hover:bg-forest-900 hover:text-cream-100 dark:hover:bg-gold-500 dark:hover:text-forest-950 transition-all cursor-pointer"
                  >
                    <Share2 className="h-3 w-3" />
                    Remix
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Teaser for real user posts */}
        <div className="mt-12 rounded-2xl border border-dashed border-cream-300 dark:border-forest-700 p-8 text-center">
          <p className="font-serif text-xl text-forest-600 dark:text-forest-400 mb-2">Your trips could live here</p>
          <p className="text-sm text-forest-400 dark:text-forest-500 max-w-md mx-auto">
            Generate a trip, then hit "Share" to publish it as a travel note. The community feature is in progress — posts, images, and real author profiles coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
