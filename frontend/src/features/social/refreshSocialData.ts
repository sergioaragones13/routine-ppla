import type { SupabaseClient } from "@supabase/supabase-js";

type SocialElements = {
  socialAuthStatus: HTMLElement | null;
  socialRequests: HTMLElement | null;
  socialLeaderboard: HTMLElement | null;
  socialLeaderboardTitle: HTMLElement | null;
  socialMonthlyModal: HTMLElement | null;
  socialMonthlyTitle: HTMLElement | null;
  socialMonthlyBody: HTMLElement | null;
  socialMonthlyClose: HTMLButtonElement | null;
  socialMotivationModal: HTMLElement | null;
  socialUsername: HTMLInputElement | null;
  socialMotivationCard: HTMLElement | null;
  socialMotivationClose: HTMLButtonElement | null;
  socialMotivationRank: HTMLElement | null;
  socialMotivationTitle: HTMLElement | null;
  socialMotivationText: HTMLElement | null;
};

type ClientFactory = () => { client: SupabaseClient } | null;
type UserSetter = (userId: string | null) => void;

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMotivationStorageKey(userId: string, localDateIso: string): string {
  return `social_motivation_state:${userId}:${localDateIso}`;
}

function resolveMotivationMessage(rank: number | null): string {
  if (rank === 1) return "You're leading the board. Keep the fire alive.";
  if (rank === 2) return "You're #2. One more push to take #1.";
  if (rank !== null && rank >= 3) return "You're in the chase. Time to level up today.";
  return "New day, new chance. Keep your streak alive.";
}

function getMonthRange(now: Date): { from: string; to: string; label: string } {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: toLocalIsoDate(monthStart),
    to: toLocalIsoDate(monthEnd),
    label: now.toLocaleString("en-US", { month: "long", year: "numeric" })
  };
}

function getPeriodRange(
  period: "month" | "30d" | "all",
  now: Date
): { from: string; to: string; label: string } {
  if (period === "30d") {
    const to = toLocalIsoDate(now);
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 29);
    return { from: toLocalIsoDate(fromDate), to, label: "Last 30 days" };
  }
  if (period === "all") {
    return { from: "2000-01-01", to: "2100-12-31", label: "All time" };
  }
  return getMonthRange(now);
}

export function createSocialRefresher(
  getClient: ClientFactory,
  elements: SocialElements,
  setUserId: UserSetter
): () => Promise<void> {
  const {
    socialAuthStatus,
    socialRequests,
    socialLeaderboard,
    socialLeaderboardTitle,
    socialMonthlyModal,
    socialMonthlyTitle,
    socialMonthlyBody,
    socialMonthlyClose,
    socialMotivationModal,
    socialUsername,
    socialMotivationCard,
    socialMotivationClose,
    socialMotivationRank,
    socialMotivationTitle,
    socialMotivationText
  } = elements;
  let activePeriod: "month" | "30d" | "all" = "month";
  let lastMonthlyModalTrigger: HTMLElement | null = null;
  let lastMotivationModalTrigger: HTMLElement | null = null;

  const closeMonthlyModal = (): void => {
    if (!socialMonthlyModal) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && socialMonthlyModal.contains(active)) {
      active.blur();
    }
    socialMonthlyModal.classList.remove("routine__confirm-modal--open");
    socialMonthlyModal.setAttribute("aria-hidden", "true");
    lastMonthlyModalTrigger?.focus();
  };

  const periodButtons = document.querySelectorAll<HTMLButtonElement>("[data-social-period]");
  periodButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const period = (btn.dataset.socialPeriod as "month" | "30d" | "all" | undefined) || "month";
      activePeriod = period;
      periodButtons.forEach((item) => {
        item.classList.toggle("routine__social-period--active", item === btn);
      });
      void refresh();
    });
  });

  const openMonthlyModal = async (
    client: SupabaseClient,
    targetUserId: string,
    targetUsername: string,
    trigger?: HTMLElement | null
  ): Promise<void> => {
    if (!socialMonthlyModal || !socialMonthlyTitle || !socialMonthlyBody) return;
    lastMonthlyModalTrigger = trigger || null;
    const { from, to, label } = getPeriodRange(activePeriod, new Date());
    socialMonthlyTitle.textContent = `${targetUsername} · ${label}`;
    socialMonthlyBody.innerHTML =
      '<div class="routine__social-item routine__social-item--loading">Loading monthly record...</div>';
    socialMonthlyModal.classList.add("routine__confirm-modal--open");
    socialMonthlyModal.setAttribute("aria-hidden", "false");
    socialMonthlyClose?.focus();

    const { data: activities, error } = await client
      .from("workout_activity_logs")
      .select("activity_type")
      .eq("user_id", targetUserId)
      .gte("activity_date", from)
      .lte("activity_date", to);
    if (error) {
      socialMonthlyBody.innerHTML =
        '<div class="routine__social-item routine__social-item--empty">Could not load monthly record.</div>';
      return;
    }

    const { data: ranked, error: rankedError } = await client.rpc("get_friend_leaderboard_period", {
      p_from: from,
      p_to: to
    });
    const targetRanked = rankedError
      ? null
      : (ranked || []).find(
          (entry: Record<string, unknown>) => String(entry.user_id || "") === targetUserId
        ) || null;

    const gym = (activities || []).filter((row) => String(row.activity_type || "") === "gym").length;
    const extra = (activities || []).filter((row) => String(row.activity_type || "") === "extra").length;
    const missed = (activities || []).filter((row) => String(row.activity_type || "") === "missed").length;
    const points = targetRanked ? Number(targetRanked.score || 0) : 0;
    const streak = targetRanked ? Number(targetRanked.streak || 0) : 0;

    socialMonthlyBody.innerHTML = `
      <div class="routine__social-item"><span>Gym activities</span><span>${gym}</span></div>
      <div class="routine__social-item"><span>Extra activities</span><span>${extra}</span></div>
      <div class="routine__social-item"><span>Missed days</span><span>${missed}</span></div>
      <div class="routine__social-item"><span>Streak in period</span><span>${streak}</span></div>
      <div class="routine__social-item routine__social-item--me"><span>Period points (with streak)</span><span>${points}</span></div>
    `;
  };

  socialMonthlyClose?.addEventListener("click", closeMonthlyModal);
  socialMonthlyModal?.addEventListener("click", (event) => {
    if (event.target !== socialMonthlyModal) return;
    closeMonthlyModal();
  });

  const hideMotivationModal = (): void => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && socialMotivationModal?.contains(active)) {
      active.blur();
    }
    socialMotivationModal?.classList.remove("routine__confirm-modal--open");
    socialMotivationModal?.setAttribute("aria-hidden", "true");
    lastMotivationModalTrigger?.focus();
  };

  const showMotivationModal = (): void => {
    lastMotivationModalTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    socialMotivationCard?.classList.remove("routine__social-motivation--burst");
    void socialMotivationCard?.offsetWidth;
    socialMotivationCard?.classList.add("routine__social-motivation--burst");
    socialMotivationModal?.classList.add("routine__confirm-modal--open");
    socialMotivationModal?.setAttribute("aria-hidden", "false");
    socialMotivationClose?.focus();
  };

  socialMotivationClose?.addEventListener("click", hideMotivationModal);
  socialMotivationModal?.addEventListener("click", (event) => {
    if (event.target === socialMotivationModal) {
      hideMotivationModal();
    }
  });

  const refresh = async (): Promise<void> => {
    const setup = getClient();
    if (!setup) {
      if (socialAuthStatus) socialAuthStatus.textContent = "Missing Supabase env config.";
      return;
    }
    const { client } = setup;

    if (socialRequests) {
      socialRequests.innerHTML =
        '<div class="routine__social-item routine__social-item--loading">Loading...</div>';
    }
    if (socialLeaderboard) {
      socialLeaderboard.innerHTML =
        '<div class="routine__social-item routine__social-item--loading">Loading...</div>';
    }

    try {
      const { data: sessionData } = await client.auth.getSession();
      const user = sessionData.session?.user || null;
      setUserId(user?.id || null);
      if (!user) {
        if (socialAuthStatus) socialAuthStatus.textContent = "Not logged in.";
        if (socialRequests) {
          socialRequests.innerHTML =
            '<div class="routine__social-item routine__social-item--empty">No pending requests.</div>';
        }
        if (socialLeaderboard) {
          socialLeaderboard.innerHTML =
            '<div class="routine__social-item routine__social-item--empty">No leaderboard data.</div>';
        }
        hideMotivationModal();
        return;
      }

      if (socialAuthStatus) socialAuthStatus.textContent = `Logged in as ${user.email || user.id}`;

      const { data: me } = await client
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      if (socialUsername) socialUsername.value = (me?.username as string) || "";

      try {
        const { data: requests, error: requestsError } = await client
          .from("friend_requests")
          .select("id,from_user")
          .eq("to_user", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        if (requestsError) throw requestsError;

        const fromUserIds = (requests || [])
          .map((request) => request.from_user as string | null)
          .filter((id): id is string => Boolean(id));
        let usernameByUserId = new Map<string, string>();
        if (fromUserIds.length > 0) {
          const { data: profiles } = await client
            .from("profiles")
            .select("id,username")
            .in("id", fromUserIds);
          usernameByUserId = new Map(
            (profiles || []).map((profile) => [
              profile.id as string,
              ((profile.username as string | undefined) || "").trim()
            ])
          );
        }

        if (socialRequests) {
          socialRequests.innerHTML = "";
          if (!requests || requests.length === 0) {
            socialRequests.innerHTML =
              '<div class="routine__social-item routine__social-item--empty">No pending requests.</div>';
          }
          (requests || []).forEach((request) => {
            const row = document.createElement("div");
            row.className = "routine__social-item";
            const fromUserId = (request.from_user as string | undefined) || "";
            const fromUsername = usernameByUserId.get(fromUserId) || "Unknown";
            row.innerHTML = `<span>${fromUsername} sent you a request</span><div class="routine__social-actions"><button type="button" class="routine__notes-save" data-action="accept">Accept</button><button type="button" class="routine__notes-save" data-action="reject">Reject</button></div>`;
            row.querySelector('[data-action="accept"]')?.addEventListener("click", async () => {
              await client
                .from("friend_requests")
                .update({ status: "accepted", responded_at: new Date().toISOString() })
                .eq("id", request.id);
              await refresh();
            });
            row.querySelector('[data-action="reject"]')?.addEventListener("click", async () => {
              await client
                .from("friend_requests")
                .update({ status: "rejected", responded_at: new Date().toISOString() })
                .eq("id", request.id);
              await refresh();
            });
            socialRequests.appendChild(row);
          });
        }
      } catch {
        if (socialRequests) {
          socialRequests.innerHTML =
            '<div class="routine__social-item routine__social-item--empty">Could not load requests.</div>';
        }
      }

      const { data: friendRows } = await client
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user.id);
      const userIds = Array.from(
        new Set<string>([
          user.id,
          ...((friendRows || [])
            .map((row) => row.friend_id as string | null)
            .filter((id): id is string => Boolean(id)))
        ])
      );

      const { data: profiles } = await client
        .from("profiles")
        .select("id,username")
        .in("id", userIds);
      const usernameById = new Map<string, string>(
        (profiles || []).map((row) => [
          row.id as string,
          ((row.username as string | undefined) || "Unknown").trim() || "Unknown"
        ])
      );

      const { from, to, label } = getPeriodRange(activePeriod, new Date());
      if (socialLeaderboardTitle) {
        socialLeaderboardTitle.textContent = `Leaderboard · ${label}`;
      }
      const { data: ranked, error: rankedError } = await client.rpc("get_friend_leaderboard_period", {
        p_from: from,
        p_to: to
      });
      if (rankedError) throw rankedError;

      if (socialLeaderboard) {
        socialLeaderboard.innerHTML = "";
        if (!ranked || ranked.length === 0) {
          const warn = document.createElement("div");
          warn.className = "routine__social-item routine__social-item--empty";
          warn.textContent = "No leaderboard data for this period yet.";
          socialLeaderboard.appendChild(warn);
        }
        (ranked || []).forEach((entry: Record<string, unknown>, index: number) => {
          const entryUserId = String(entry.user_id || "");
          const entryUsername = (String(entry.username || "").trim() || usernameById.get(entryUserId) || "Unknown");
          const entryScore = Number(entry.score || 0);
          const entryStreak = Number(entry.streak || 0);
          const entryExtra = Number(entry.extra_sessions || 0);
          const isMe = entryUserId === user.id;
          const row = document.createElement("div");
          row.className = isMe
            ? "routine__social-item routine__social-item--leaderboard routine__social-item--me"
            : "routine__social-item routine__social-item--leaderboard";
          row.innerHTML = `
            <span class="routine__leaderboard-user">#${index + 1} ${isMe ? "You" : entryUsername}</span>
            <span class="routine__leaderboard-score">${entryScore} pts</span>
            <span class="routine__leaderboard-fire-wrap">
                <span class="routine__leaderboard-fire-count">${entryStreak}</span>
                <span class="routine__leaderboard-fire fire" aria-hidden="true">
                  <span class="fire-left">
                    <span class="main-fire"></span>
                    <span class="particle-fire"></span>
                  </span>
                  <span class="fire-center">
                    <span class="main-fire"></span>
                    <span class="particle-fire"></span>
                  </span>
                  <span class="fire-right">
                    <span class="main-fire"></span>
                    <span class="particle-fire"></span>
                  </span>
                  <span class="fire-bottom">
                    <span class="main-fire"></span>
                  </span>
                </span>
            </span>
            <span class="routine__leaderboard-extra">
              <span class="routine__leaderboard-extra-icon loader" aria-hidden="true">
                <svg
                  viewBox="0 0 256 256"
                  class="star star1"
                  height="16"
                  width="16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M234.5,114.38l-45.1,39.36,13.51,58.6a16,16,0,0,1-23.84,17.34l-51.11-31-51,31a16,16,0,0,1-23.84-17.34L66.61,153.8,21.5,114.38a16,16,0,0,1,9.11-28.06l59.46-5.15,23.21-55.36a15.95,15.95,0,0,1,29.44,0h0L166,81.17l59.44,5.15a16,16,0,0,1,9.11,28.06Z"></path>
                </svg>
              </span>
              <span>${entryExtra}</span>
            </span>
          `;
          row.addEventListener("click", () => {
            void openMonthlyModal(client, entryUserId, isMe ? "You" : entryUsername, row);
          });
          row.style.cursor = "pointer";
          socialLeaderboard.appendChild(row);
        });
      }

      const myRankEntryIndex = (ranked || []).findIndex(
        (entry: Record<string, unknown>) => String(entry.user_id || "") === user.id
      );
      const myRank = myRankEntryIndex >= 0 ? myRankEntryIndex + 1 : null;
      const myStreak =
        myRankEntryIndex >= 0 ? Number((ranked || [])[myRankEntryIndex]?.streak || 0) : 0;
      const localDateIso = toLocalIsoDate(new Date());
      const storageKey = getMotivationStorageKey(user.id, localDateIso);
      const rawState = window.localStorage.getItem(storageKey);
      let lastShownRank: number | null = null;
      let shownToday = false;
      if (rawState) {
        try {
          const parsed = JSON.parse(rawState) as { shown?: boolean; lastShownRank?: number | null };
          shownToday = Boolean(parsed?.shown);
          lastShownRank = typeof parsed?.lastShownRank === "number" ? parsed.lastShownRank : null;
        } catch {
          shownToday = false;
          lastShownRank = null;
        }
      }
      const shouldShowMotivation = !shownToday || lastShownRank !== myRank;
      if (
        socialMotivationCard &&
        socialMotivationRank &&
        socialMotivationTitle &&
        socialMotivationText
      ) {
        if (shouldShowMotivation) {
          socialMotivationRank.textContent = myRank ? String(myRank) : "-";
          socialMotivationTitle.textContent = `${Math.max(myStreak, 0)} day${myStreak === 1 ? "" : "s"} streak`;
          socialMotivationText.textContent = resolveMotivationMessage(myRank);
          showMotivationModal();
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({
              shown: true,
              lastShownRank: myRank,
              lastShownAt: new Date().toISOString()
            })
          );
        } else {
          hideMotivationModal();
        }
      }
    } catch {
      if (socialAuthStatus) socialAuthStatus.textContent = "Failed to load social data.";
      if (socialLeaderboard) {
        socialLeaderboard.innerHTML =
          '<div class="routine__social-item routine__social-item--empty">Could not load leaderboard.</div>';
      }
      hideMotivationModal();
    }
  };

  return refresh;
}
