import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { AchievementBadgeShelf } from "@/components/ui/AchievementBadge";
import { ProfileCoverPhoto } from "@/components/profile/ProfileCoverPhoto";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { FollowButton } from "@/components/seller/FollowButton";
import { getTrustTier } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const SOCIAL_ICONS: Record<string, string> = {
  twitter:   "𝕏",
  instagram: "📸",
  youtube:   "▶",
  website:   "🌐",
};

export async function generateMetadata({ params }: { params: { username: string } }) {
  try {
    const user = await prisma.user.findUnique({
      where: { username: params.username },
      select: { username: true, name: true, bio: true },
    });
    if (!user) return {};
    return {
      title: `${user.username ?? user.name}`,
      description: user.bio?.slice(0, 160) ?? `View ${user.username}'s listings and reviews on AccsMarkets.`,
      // /seller/[username] renders the same user's public profile and is the
      // one listed in the sitemap — point this duplicate at it.
      alternates: { canonical: `/seller/${user.username ?? params.username}` },
    };
  } catch {
    return {};
  }
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const session = await getServerSession(authOptions);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = null;
  try {
    user = await prisma.user.findUnique({
      where: { username: params.username },
      include: {
        listings: {
          where: { status: "ACTIVE" },
          orderBy: [{ isPremiumFeatured: "desc" }, { createdAt: "desc" }],
          take: 12,
        },
        reviewsReceived: {
          include: { reviewer: { select: { username: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        achievementBadges: true,
        _count: {
          select: {
            followers: true,
            escrowsAsSeller: { where: { status: "COMPLETED" } },
          },
        },
      },
    });
  } catch {
    notFound();
  }
  if (!user || user.isBanned) notFound();

  const isOwnProfile = session?.user?.id === user.id;

  const isFollowing =
    session?.user?.id && !isOwnProfile
      ? !!(await prisma.userFollow.findUnique({
          where: {
            followerId_followingId: {
              followerId: session.user.id,
              followingId: user.id,
            },
          },
        }))
      : false;

  const avgRating =
    user.reviewsReceived.length > 0
      ? user.reviewsReceived.reduce((s: number, r: { rating: number }) => s + r.rating, 0) /
        user.reviewsReceived.length
      : null;

  const socialLinks = (user.socialLinks as Record<string, string> | null) ?? {};
  const tier = getTrustTier(user.trustScore);

  return (
    <div className="mx-auto max-w-2xl px-0 sm:px-4 pb-10">
      {/* Cover photo */}
      <div className="sm:mt-6 sm:rounded-t-2xl overflow-hidden">
        <ProfileCoverPhoto coverUrl={user.coverPhoto ?? null} isOwn={isOwnProfile} />
      </div>

      {/* Avatar + action button row */}
      <div className="relative px-4">
        <div className="absolute -top-10 left-4">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name ?? user.username ?? ""}
              className="h-20 w-20 rounded-full border-4 border-background object-cover shadow-md"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-background bg-brand-100 dark:bg-brand-900/50 text-2xl font-bold text-brand-700 dark:text-brand-400 shadow-md">
              {(user.username ?? user.name ?? "?")[0].toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 min-h-[3rem]">
          {isOwnProfile ? (
            <Link
              href="/dashboard/settings"
              className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              Edit profile
            </Link>
          ) : session?.user ? (
            <FollowButton
              sellerId={user.id}
              sellerUsername={user.username ?? ""}
              initialFollowing={!!isFollowing}
              initialCount={user._count?.followers ?? 0}
            />
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Follow
            </Link>
          )}
        </div>

        {/* Name + bio */}
        <div className="mt-2 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{user.username ?? user.name}</h1>
            <VerifiedBadge badge={user.verifiedBadge} size={16} />
          </div>
          <p className={`text-sm font-medium ${tier.className}`}>
            {tier.label} · {user.trustScore}/100
          </p>
          {user.bio && (
            <p className="mt-2 text-sm text-muted leading-relaxed">{user.bio}</p>
          )}
          <p className="mt-1 text-xs text-muted">Member since {formatDate(user.createdAt)}</p>
          {Object.entries(socialLinks).filter(([, v]) => v).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-3">
              {Object.entries(socialLinks)
                .filter(([, v]) => v)
                .map(([key, url]) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-brand-500 hover:underline"
                  >
                    <span>{SOCIAL_ICONS[key] ?? "🔗"}</span>
                    <span>{key}</span>
                  </a>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <ProfileStats
        followers={user._count?.followers ?? 0}
        sales={user._count?.escrowsAsSeller ?? 0}
        listings={user.listings.length}
        avgRating={avgRating}
        reviewCount={user.reviewsReceived.length}
      />

      {/* Achievement badges */}
      {user.achievementBadges.length > 0 && (
        <div className="px-4 py-4 border-b border-surface-border">
          <AchievementBadgeShelf
            badges={user.achievementBadges.map((b: { badge: string }) => b.badge)}
          />
        </div>
      )}

      {/* Tabbed listings + reviews */}
      <ProfileTabs
        listings={user.listings}
        reviews={user.reviewsReceived}
        sellerUsername={user.username ?? null}
        sellerName={user.name ?? null}
        sellerVerifiedBadge={user.verifiedBadge}
      />
    </div>
  );
}
