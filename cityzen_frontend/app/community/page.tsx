"use client";

import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  createCommunityGroup,
  createCommunityMessage,
  getCommunityGroups,
  getCommunityMessages,
  joinCommunityGroup,
  leaveCommunityGroup,
  markCommunityMessageSeen,
  softDeleteCommunityMessage,
} from "@/lib/api/community";
import { getMyProfile, refreshAccessToken } from "@/lib/api/auth";
import { API_BASE_URL } from "@/config/api";
import {
  ApiError,
  type CommunityGroup,
  type CommunityMessage,
  type UserProfile,
} from "@/lib/api/types";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/auth/token-store";
import { CommunitySidebar } from "@/components/community/community-sidebar";
import { CommunityChatPanel } from "@/components/community/community-chat-panel";
import { Loader2 } from "lucide-react";

/* ─── Utils ────────────────────────────────────────────────── */

function toAbsoluteUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function getGroupBannerUrl(g: CommunityGroup) {
  return toAbsoluteUrl(g.banner_url || g.banner || null);
}

function buildGroupWsUrl(groupId: number, token: string) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const ws = base.startsWith("https://") ? base.replace("https://", "wss://") : base.replace("http://", "ws://");
  return `${ws}/ws/community/groups/${groupId}/?token=${encodeURIComponent(token)}`;
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function CommunityPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [membershipUpdating, setMembershipUpdating] = useState(false);
  const [navbarOffset, setNavbarOffset] = useState(104);
  const [wsConnected, setWsConnected] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedGroup = useMemo(() => groups.find((g) => g.id === selectedGroupId) || null, [groups, selectedGroupId]);
  const amMember = useMemo(() => !!(selectedGroup && profile && selectedGroup.members.includes(profile.id)), [profile, selectedGroup]);
  const canCreateGroups = Boolean(profile?.is_staff);

  const filteredGroups = useMemo(
    () => groups.filter((g) => (g.groupchat_name || g.group_name).toLowerCase().includes(search.toLowerCase())),
    [groups, search],
  );

  const groupSection = filteredGroups;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    function upd() {
      const nav = document.querySelector("header.sticky") as HTMLElement | null;
      setNavbarOffset(nav ? Math.max(72, Math.ceil(nav.getBoundingClientRect().height + nav.getBoundingClientRect().top)) : 104);
    }
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  async function withToken<T>(fn: (t: string) => Promise<T>) {
    const a = getAccessToken(), r = getRefreshToken();
    if (!a) throw new Error("Please login.");
    try { return await fn(a); }
    catch (e) {
      if (!(e instanceof ApiError && e.status === 401 && r)) throw e;
      const fresh = await refreshAccessToken(r as string);
      setTokens(fresh.access, r as string);
      return fn(fresh.access);
    }
  }

  async function loadGroups() {
    setGroupsLoading(true);
    try {
      const f = await getCommunityGroups();
      setGroups(f);
      setSelectedGroupId((p) => (p && f.some((g) => g.id === p) ? p : f[0]?.id ?? null));
    } catch { setError("Failed to load groups."); }
    finally { setGroupsLoading(false); }
  }

  async function loadMessages(groupId: number) {
    try {
      const token = getAccessToken() || undefined;
      const fetched = await getCommunityMessages(groupId, token);
      const asc = [...fetched].reverse();
      setMessages(asc);
      if (token) {
        const unseen = asc.filter((m) => !m.is_seen_by_me);
        if (unseen.length) await Promise.all(unseen.slice(-8).map((m) => markCommunityMessageSeen(groupId, m.id, token)));
      }
    } catch { setMessages([]); }
    finally { setMessagesLoading(false); }
  }

  useEffect(() => {
    let ok = true;
    async function boot() {
      setLoading(true);
      try {
        const gs = await getCommunityGroups();
        if (!ok) return;
        setGroups(gs);
        if (gs.length) setSelectedGroupId((p) => p ?? gs[0].id);
        try {
          await withToken(async (t) => {
            const us = await getMyProfile(t);
            if (ok) setProfile(us[0] || null);
          });
        } catch { if (ok) setProfile(null); }
      } catch (e) { if (ok) setError(e instanceof Error ? e.message : "Load failed."); }
      finally { if (ok) setLoading(false); }
    }
    boot();
    return () => { ok = false; };
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;
    setMessagesLoading(true);
    loadMessages(selectedGroupId);
    const id = setInterval(() => loadMessages(selectedGroupId), wsConnected ? 15000 : 2000);
    return () => clearInterval(id);
  }, [selectedGroupId, wsConnected]);

  useEffect(() => {
    if (loading) return;
    const id = setInterval(loadGroups, 15000);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!selectedGroupId) return;
    const token = getAccessToken();
    if (!token) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let gone = false;
    const conn = () => {
      const ws = new WebSocket(buildGroupWsUrl(selectedGroupId, token));
      wsRef.current = ws;
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (e) => {
        try {
          const p = JSON.parse(e.data) as { event?: string; message?: CommunityMessage; message_id?: number; group_id?: number; online_users?: number[] };
          if (p.event === "message_created" && p.message)
            setMessages((prev) => prev.some((m) => m.id === p.message?.id) ? prev : [...prev, p.message as CommunityMessage]);
          else if (p.event === "message_deleted" && typeof p.message_id === "number")
            setMessages((prev) => prev.map((m) => m.id === p.message_id ? { ...m, delete_msg: true, body: null } : m));
          else if (p.event === "online_update" && p.group_id && p.online_users)
            setGroups((prev) => prev.map((g) => g.id === p.group_id ? { ...g, users_online: p.online_users as number[] } : g));
        } catch { /* noop */ }
      };
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        setWsConnected(false);
        if (!gone) timer = setTimeout(conn, 2500);
      };
    };
    conn();
    return () => { gone = true; setWsConnected(false); if (timer) clearTimeout(timer); const c = wsRef.current; wsRef.current = null; c?.close(); };
  }, [selectedGroupId]);

  async function onCreateGroup(e: FormEvent) {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    setCreatingGroup(true);
    try { await withToken((t) => createCommunityGroup({ groupchat_name: name, is_private: newGroupPrivate }, t)); setNewGroupName(""); loadGroups(); }
    catch { setError("Could not create group."); }
    finally { setCreatingGroup(false); }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!selectedGroupId || !composer.trim()) return;
    const body = composer.trim();
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN && amMember) { ws.send(JSON.stringify({ event: "send_message", body })); setComposer(""); return; }
    setSending(true);
    try {
      const created = await withToken((t) => createCommunityMessage(selectedGroupId, { body }, t));
      setMessages((p) => [...p, created]);
      setComposer("");
      const a = getAccessToken();
      if (a) markCommunityMessageSeen(selectedGroupId, created.id, a).catch(() => undefined);
    } finally { setSending(false); }
  }

  async function onToggleMembership() {
    if (!selectedGroupId || !profile) return;
    const was = amMember;
    setMembershipUpdating(true); setError(null);
    try {
      await withToken((t) => was ? leaveCommunityGroup(selectedGroupId, t) : joinCommunityGroup(selectedGroupId, t));
      setGroups((prev) => prev.map((g) => {
        if (g.id !== selectedGroupId) return g;
        return was
          ? { ...g, members: g.members.filter((id) => id !== profile.id), users_online: g.users_online.filter((id) => id !== profile.id) }
          : g.members.includes(profile.id) ? g : { ...g, members: [...g.members, profile.id] };
      }));
      await loadGroups();
    } catch { setError(was ? "Could not leave group." : "Could not join group."); }
    finally { setMembershipUpdating(false); }
  }

  async function onDelete(groupId: number, msgId: number) {
    const t = getAccessToken();
    if (!t) return;
    try {
      await softDeleteCommunityMessage(groupId, msgId, t);
      setMessages((p) => p.map((m) => m.id === msgId ? { ...m, delete_msg: true, body: null } : m));
    } catch { /* noop */ }
  }

  const groupName = selectedGroup ? (selectedGroup.groupchat_name || selectedGroup.group_name) : "";

  /* Loading */
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: `calc(100dvh - ${navbarOffset}px - 10px)` }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl border border-teal-500/25 bg-white/35 backdrop-blur-md flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-teal-400" />
          </div>
          <p className="text-xs font-medium text-slate-600/80">Connecting…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <main
      className="relative flex w-full overflow-visible px-3 md:px-4 lg:px-6"
      style={{ height: `calc(100dvh - ${navbarOffset}px - 10px)` }}
    >
      <div className="relative mt-2 flex h-[calc(100%-0.5rem)] w-full gap-3 md:gap-4">
        <div
          className="relative z-40 h-full w-0 shrink-0 overflow-visible md:w-[270px] md:overflow-hidden md:rounded-3xl"
          style={{ border: "1px solid #c5d7ea99", boxShadow: "0 14px 30px #15284822", background: "#e9f5ff45", backdropFilter: "blur(14px)" }}
        >
          <AnimatePresence>
            <CommunitySidebar
              mobileSidebarOpen={mobileSidebarOpen}
              onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
              search={search}
              onSearchChange={setSearch}
              canCreateGroups={canCreateGroups}
              newGroupName={newGroupName}
              creatingGroup={creatingGroup}
              onNewGroupNameChange={setNewGroupName}
              onCreateGroup={onCreateGroup}
              groups={groupSection}
              selectedGroupId={selectedGroupId}
              messages={messages}
              getGroupBannerUrl={getGroupBannerUrl}
              onSelectGroup={setSelectedGroupId}
              profile={profile}
              onLogout={clearTokens}
            />
          </AnimatePresence>
        </div>

        <div
          className="relative flex min-w-0 flex-1 overflow-hidden rounded-3xl"
          style={{ border: "1px solid #c5d7ea99", boxShadow: "0 14px 30px #15284822", background: "#e9f5ff45", backdropFilter: "blur(14px)" }}
        >
          <CommunityChatPanel
            selectedGroup={selectedGroup}
            groupName={groupName}
            getGroupBannerUrl={getGroupBannerUrl}
            mobileSidebarOpen={mobileSidebarOpen}
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
            wsConnected={wsConnected}
            membershipUpdating={membershipUpdating}
            amMember={amMember}
            onToggleMembership={onToggleMembership}
            error={error}
            onClearError={() => setError(null)}
            messages={messages}
            messagesLoading={messagesLoading}
            scrollRef={scrollRef}
            profile={profile}
            onDelete={onDelete}
            composer={composer}
            onComposerChange={setComposer}
            onSend={onSend}
            sending={sending}
          />
        </div>
      </div>
    </main>
  );
}