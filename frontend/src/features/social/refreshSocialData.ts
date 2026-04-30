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
  socialUsername: HTMLInputElement | null;
};

type ClientFactory = () => { client: SupabaseClient } | null;
type UserSetter = (userId: string | null) => void;

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    socialUsername
  } = elements;

  const openMonthlyModal = async (
    client: SupabaseClient,
    targetUserId: string,
    targetUsername: string
  ): Promise<void> => {
    if (!socialMonthlyModal || !socialMonthlyTitle || !socialMonthlyBody) return;
    const { from, to, label } = getMonthRange(new Date());
    socialMonthlyTitle.textContent = `${targetUsername} · ${label}`;
    socialMonthlyBody.innerHTML =
      '<div class="routine__social-item routine__social-item--loading">Loading monthly record...</div>';
    socialMonthlyModal.classList.add("routine__confirm-modal--open");
    socialMonthlyModal.setAttribute("aria-hidden", "false");

    const { data: activities, error } = await client
      .from("workout_activity_logs")
      .select("activity_type,points")
      .eq("user_id", targetUserId)
      .gte("activity_date", from)
      .lte("activity_date", to);
    if (error) {
      socialMonthlyBody.innerHTML =
        '<div class="routine__social-item routine__social-item--empty">Could not load monthly record.</div>';
      return;
    }

    const gym = (activities || []).filter((row) => String(row.activity_type || "") === "gym").length;
    const extra = (activities || []).filter((row) => String(row.activity_type || "") === "extra").length;
    const missed = (activities || []).filter((row) => String(row.activity_type || "") === "missed").length;
    const points = (activities || []).reduce((acc, row) => acc + Number(row.points || 0), 0);

    socialMonthlyBody.innerHTML = `
      <div class="routine__social-item"><span>Gym activities</span><span>${gym}</span></div>
      <div class="routine__social-item"><span>Extra activities</span><span>${extra}</span></div>
      <div class="routine__social-item"><span>Missed days</span><span>${missed}</span></div>
      <div class="routine__social-item routine__social-item--me"><span>Monthly points</span><span>${points}</span></div>
    `;
  };

  socialMonthlyClose?.addEventListener("click", () => {
    socialMonthlyModal?.classList.remove("routine__confirm-modal--open");
    socialMonthlyModal?.setAttribute("aria-hidden", "true");
  });
  socialMonthlyModal?.addEventListener("click", (event) => {
    if (event.target !== socialMonthlyModal) return;
    socialMonthlyModal.classList.remove("routine__confirm-modal--open");
    socialMonthlyModal.setAttribute("aria-hidden", "true");
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

      const { from, to, label } = getMonthRange(new Date());
      if (socialLeaderboardTitle) {
        socialLeaderboardTitle.textContent = `Leaderboard · ${label}`;
      }

      const { data: monthlyActivities } = await client
        .from("workout_activity_logs")
        .select("user_id,activity_type,points")
        .in("user_id", userIds)
        .gte("activity_date", from)
        .lte("activity_date", to);

      const monthlyByUserId = new Map<string, { points: number; trainedDays: number; extraDays: number }>();
      userIds.forEach((id) => {
        monthlyByUserId.set(id, { points: 0, trainedDays: 0, extraDays: 0 });
      });

      (monthlyActivities || []).forEach((row) => {
        const userId = (row.user_id as string | undefined) || "";
        const bucket = monthlyByUserId.get(userId);
        if (!bucket) return;
        const mode = String(row.activity_type || "").toLowerCase();
        const points = Number(row.points || 0);
        bucket.points += points;
        if (mode === "extra") bucket.extraDays += 1;
        if (mode === "gym" || mode === "extra") bucket.trainedDays += 1;
      });

      const ranked = userIds
        .map((id) => {
          const monthStats = monthlyByUserId.get(id) || { points: 0, trainedDays: 0, extraDays: 0 };
          return {
            user_id: id,
            username: usernameById.get(id) || "Unknown",
            score: monthStats.points,
            streak: monthStats.trainedDays,
            extra_sessions: monthStats.extraDays
          };
        })
        .sort((a, b) => b.score - a.score);

      if (socialLeaderboard) {
        socialLeaderboard.innerHTML = "";
        if ((monthlyActivities || []).length === 0) {
          const warn = document.createElement("div");
          warn.className = "routine__social-item routine__social-item--empty";
          warn.textContent = "No activities have been recorded for the current month yet.";
          socialLeaderboard.appendChild(warn);
        }
        ranked.forEach((entry, index) => {
          const isMe = entry.user_id === user.id;
          const row = document.createElement("div");
          row.className = isMe
            ? "routine__social-item routine__social-item--me"
            : "routine__social-item";
          row.innerHTML = `<span>#${index + 1} ${isMe ? "You" : entry.username}</span><span>${entry.score} pts · 🔥 ${entry.streak} · 🚴 ${entry.extra_sessions}</span>`;
          row.addEventListener("click", () => {
            void openMonthlyModal(client, entry.user_id, isMe ? "You" : entry.username);
          });
          row.style.cursor = "pointer";
          socialLeaderboard.appendChild(row);
        });
      }
    } catch {
      if (socialAuthStatus) socialAuthStatus.textContent = "Failed to load social data.";
      if (socialLeaderboard) {
        socialLeaderboard.innerHTML =
          '<div class="routine__social-item routine__social-item--empty">Could not load leaderboard.</div>';
      }
    }
  };

  return refresh;
}
