"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
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
import { ApiError, type CommunityGroup, type CommunityMessage, type UserProfile } from "@/lib/api/types";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/token-store";
import { Send, LogOut, RefreshCw, Plus, Trash2, Paperclip, Users, ShieldCheck } from "lucide-react";

// --- Utility Functions ---
function toAbsoluteUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function formatTime(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getGroupBannerUrl(group: CommunityGroup) {
  return toAbsoluteUrl(group.banner_url || group.banner || null);
}

function getProfileHref(message: CommunityMessage) {
  const profileUrl = message.author_profile_url;
  if (profileUrl?.startsWith("/")) return profileUrl;
  if (profileUrl?.startsWith("http://") || profileUrl?.startsWith("https://")) return profileUrl;
  return `/profile?user=${encodeURIComponent(message.author_username || "")}`;
}

function buildGroupWsUrl(groupId: number, token: string) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const wsBase = base.startsWith("https://")
    ? base.replace("https://", "wss://")
    : base.replace("http://", "ws://");
  return `${wsBase}/ws/community/groups/${groupId}/?token=${encodeURIComponent(token)}`;
}

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
  const [navbarOffset, setNavbarOffset] = useState(104);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || null,
    [groups, selectedGroupId],
  );

  const amMember = useMemo(() => {
    if (!selectedGroup || !profile) return false;
    return selectedGroup.members.includes(profile.id);
  }, [profile, selectedGroup]);

  const canCreateGroups = Boolean(profile?.is_staff);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Calculate available viewport height under the sticky navbar.
  useEffect(() => {
    function updateNavbarOffset() {
      const navbarRoot = document.querySelector("header.sticky") as HTMLElement | null;
      if (!navbarRoot) {
        setNavbarOffset(104);
        return;
      }

      const rect = navbarRoot.getBoundingClientRect();
      const nextOffset = Math.max(72, Math.ceil(rect.height + rect.top));
      setNavbarOffset(nextOffset);
    }

    updateNavbarOffset();
    window.addEventListener("resize", updateNavbarOffset);

    return () => {
      window.removeEventListener("resize", updateNavbarOffset);
    };
  }, []);

  async function withAccessToken<T>(fn: (token: string) => Promise<T>) {
    const access = getAccessToken();
    const refresh = getRefreshToken();
    if (!access) throw new Error("Please login to use community features.");
    try {
      return await fn(access);
    } catch (err) {
      const canRefresh = err instanceof ApiError && err.status === 401 && Boolean(refresh);
      if (!canRefresh) throw err;
      const refreshed = await refreshAccessToken(refresh as string);
      setTokens(refreshed.access, refresh as string);
      return fn(refreshed.access);
    }
  }

  async function loadGroups() {
    setGroupsLoading(true);
    try {
      const fetchedGroups = await getCommunityGroups();
      setGroups(fetchedGroups);
      if (!selectedGroupId && fetchedGroups.length > 0) setSelectedGroupId(fetchedGroups[0].id);
    } catch (err) {
      setError("Failed to load groups.");
    } finally {
      setGroupsLoading(false);
    }
  }

  async function loadMessages(groupId: number) {
    try {
      const token = getAccessToken() || undefined;
      const fetched = await getCommunityMessages(groupId, token);
      const ascending = [...fetched].reverse();
      setMessages(ascending);

      if (token) {
        const unseen = ascending.filter((m) => !m.is_seen_by_me);
        if (unseen.length > 0) {
          await Promise.all(unseen.slice(-8).map((m) => markCommunityMessageSeen(groupId, m.id, token)));
        }
      }
    } catch (err) {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      setLoading(true);
      try {
        await withAccessToken(async (token) => {
          const users = await getMyProfile(token);
          if (!mounted) return;
          setProfile(users[0] || null);
          const fetchedGroups = await getCommunityGroups();
          if (!mounted) return;
          setGroups(fetchedGroups);
          if (fetchedGroups.length > 0) setSelectedGroupId(fetchedGroups[0].id);
        });
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Load failed.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    bootstrap();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;
    setMessagesLoading(true);
    loadMessages(selectedGroupId);

    // Poll faster if websocket is not connected.
    const intervalMs = wsConnected ? 15000 : 2000;
    const interval = setInterval(() => loadMessages(selectedGroupId), intervalMs);
    return () => clearInterval(interval);
  }, [selectedGroupId, wsConnected]);

  useEffect(() => {
    if (!selectedGroupId) return;
    const token = getAccessToken();
    if (!token) return;

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connectSocket = () => {
      const ws = new WebSocket(buildGroupWsUrl(selectedGroupId, token));
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            event?: string;
            message?: CommunityMessage;
            message_id?: number;
            group_id?: number;
            online_users?: number[];
          };

          if (payload.event === "message_created" && payload.message) {
            setMessages((prev) => {
              if (prev.some((msg) => msg.id === payload.message?.id)) return prev;
              return [...prev, payload.message as CommunityMessage];
            });
            return;
          }

          if (payload.event === "message_deleted" && typeof payload.message_id === "number") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.message_id
                  ? { ...msg, delete_msg: true, body: null }
                  : msg,
              ),
            );
            return;
          }

          if (payload.event === "online_update" && payload.group_id && payload.online_users) {
            setGroups((prev) =>
              prev.map((group) =>
                group.id === payload.group_id
                  ? { ...group, users_online: payload.online_users as number[] }
                  : group,
              ),
            );
          }
        } catch {
          return;
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        setWsConnected(false);
        if (!disposed) {
          reconnectTimer = setTimeout(connectSocket, 2500);
        }
      };
    };

    connectSocket();

    return () => {
      disposed = true;
      setWsConnected(false);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      const currentWs = wsRef.current;
      wsRef.current = null;
      currentWs?.close();
    };
  }, [selectedGroupId]);

  async function onCreateGroup(e: FormEvent) {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    setCreatingGroup(true);
    try {
      await withAccessToken((t) => createCommunityGroup({ groupchat_name: name, is_private: newGroupPrivate }, t));
      setNewGroupName("");
      loadGroups();
    } catch (err) { setError("Could not create group."); }
    finally { setCreatingGroup(false); }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!selectedGroupId || !composer.trim()) return;
    const body = composer.trim();

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && amMember) {
      ws.send(JSON.stringify({ event: "send_message", body }));
      setComposer("");
      return;
    }

    setSending(true);
    try {
      const created = await withAccessToken((t) => createCommunityMessage(selectedGroupId, { body }, t));
      setMessages((prev) => [...prev, created]);
      setComposer("");
      const access = getAccessToken();
      if (access) {
        markCommunityMessageSeen(selectedGroupId, created.id, access).catch(() => undefined);
      }
    } finally { setSending(false); }
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-slate-50"
        style={{ minHeight: `calc(100dvh - ${navbarOffset}px)` }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Connecting to City-Gen...</p>
        </div>
      </div>
    );
  }

  return (
    <main
      className="relative flex w-full flex-col overflow-hidden bg-[radial-gradient(130%_90%_at_10%_0%,#cffafe_0%,#e0f2fe_35%,#eef2ff_75%,#f8fafc_100%)] p-2 md:p-3"
      style={{ height: `calc(100dvh - ${navbarOffset}px)` }}
    >
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-24 h-80 w-80 rounded-full bg-blue-300/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-90px] left-1/3 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />

      <div className="relative flex h-full w-full flex-1 overflow-hidden rounded-[2rem] border border-white/80 bg-white/65 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        
        {/* Sidebar */}
        <aside className="hidden w-80 flex-col border-r border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(241,245,249,0.72)_100%)] md:flex">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-black tracking-tight text-slate-800">Messages</h1>
              <button onClick={loadGroups} className="text-slate-400 hover:text-cyan-600 transition-colors">
                <RefreshCw size={18} className={groupsLoading ? "animate-spin" : ""} />
              </button>
            </div>
            
            {/* Create Group (Staff only) */}
            {canCreateGroups && (
              <form onSubmit={onCreateGroup} className="mt-6 space-y-2">
                <div className="relative">
                  <input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="New Group Name"
                    className="w-full rounded-xl border-none bg-slate-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20"
                  />
                  <button disabled={creatingGroup} className="absolute right-2 top-1.5 rounded-lg bg-white p-1 shadow-sm text-cyan-600">
                    <Plus size={18} />
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-1">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={`group flex w-full flex-col gap-1 rounded-2xl px-4 py-3 transition-all ${
                  selectedGroupId === group.id 
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-200" 
                  : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {getGroupBannerUrl(group) ? (
                      <img
                        src={getGroupBannerUrl(group) as string}
                        alt={`${group.groupchat_name || group.group_name} banner`}
                        className="h-8 w-8 rounded-lg object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200/80 text-xs font-bold text-slate-500">
                        {(group.groupchat_name || group.group_name).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="font-bold truncate">{group.groupchat_name || group.group_name}</span>
                  </div>
                  {group.is_private && <ShieldCheck size={14} className={selectedGroupId === group.id ? "text-cyan-200" : "text-slate-400"} />}
                </div>
                <span className={`text-xs ${selectedGroupId === group.id ? "text-cyan-100" : "text-slate-400"}`}>
                  {group.members.length} members • {group.users_online.length} online
                </span>
              </button>
            ))}
          </div>

          {/* User Profile Footer */}
          <div className="border-t border-slate-100 p-4 bg-white/50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500" />
                <p className="truncate text-sm font-bold text-slate-700">{profile?.username}</p>
              </div>
              <button onClick={() => clearTokens()} className="text-slate-400 hover:text-red-500 transition-colors">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <section className="flex flex-1 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
          {selectedGroup ? (
            <>
              {/* Chat Header */}
              <header className="relative flex items-center justify-between overflow-hidden border-b border-slate-50 px-6 py-4">
                {getGroupBannerUrl(selectedGroup) && (
                  <>
                    <img
                      src={getGroupBannerUrl(selectedGroup) as string}
                      alt={`${selectedGroup.groupchat_name || selectedGroup.group_name} banner`}
                      className="absolute inset-0 h-full w-full object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-white/70" />
                  </>
                )}
                <div className="flex items-center gap-3">
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-cyan-100 text-cyan-700 font-bold">
                    {getGroupBannerUrl(selectedGroup) ? (
                      <img
                        src={getGroupBannerUrl(selectedGroup) as string}
                        alt={`${selectedGroup.groupchat_name || selectedGroup.group_name} avatar`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (selectedGroup.groupchat_name || selectedGroup.group_name).slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="relative z-10">
                    <h2 className="font-bold text-slate-800">{selectedGroup.groupchat_name}</h2>
                    <p className="text-xs text-emerald-500 font-medium">{selectedGroup.users_online.length} Active Now</p>
                  </div>
                </div>
                <button 
                  onClick={() => amMember ? leaveCommunityGroup(selectedGroup.id, getAccessToken()!) : joinCommunityGroup(selectedGroup.id, getAccessToken()!)}
                  className={`relative z-10 rounded-full px-5 py-2 text-xs font-bold transition-all ${
                    amMember ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600" : "bg-cyan-600 text-white hover:bg-cyan-700"
                  }`}
                >
                  {amMember ? "Joined" : "Join Group"}
                </button>
              </header>

              {/* Messages Container */}
              <div 
                ref={scrollRef}
                className="flex-1 space-y-6 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.35)_0%,rgba(226,232,240,0.28)_100%)] p-4 md:p-6"
              >
                {messages.map((message) => {
                  const isMine = profile?.id === message.author;
                  const authorImageUrl = toAbsoluteUrl(message.author_image || null);
                  return (
                    <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`group relative flex max-w-[88%] items-end gap-2 md:max-w-[68%] ${isMine ? "flex-row-reverse" : ""}`}>
                        <Link
                          href={getProfileHref(message)}
                          className="mb-1 inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm transition-transform hover:scale-105"
                          title={`${message.author_username} profile`}
                        >
                          {authorImageUrl ? (
                            <img
                              src={authorImageUrl}
                              alt={`${message.author_username} profile`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-600">
                              {message.author_username.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </Link>

                        <div className={`${isMine ? "items-end" : "items-start"}`}>
                        {/* Author Label */}
                        <Link
                          href={getProfileHref(message)}
                          className={`mb-1 block text-[10px] font-black uppercase tracking-wider transition hover:underline ${
                            isMine ? "mr-2 text-cyan-700/80 text-right" : "ml-2 text-slate-400"
                          }`}
                          title={`${message.author_username} profile`}
                        >
                          {message.author_username}
                        </Link>

                        {/* Bubble */}
                        <div className={`relative rounded-3xl px-4 py-3 shadow-sm ${
                          isMine 
                          ? "bg-cyan-600 text-white rounded-tr-none" 
                          : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                        }`}>
                          {message.delete_msg ? (
                            <p className="text-sm italic opacity-70">Message deleted</p>
                          ) : (
                            <>
                              <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed">{message.body}</p>
                              {message.file && (
                                <a 
                                  href={toAbsoluteUrl(message.file)!} 
                                  target="_blank" 
                                  className={`mt-2 flex items-center gap-2 rounded-lg p-2 text-xs ${isMine ? "bg-cyan-700/50" : "bg-slate-100"}`}
                                >
                                  <Paperclip size={14} /> {message.filename || "Attachment"}
                                </a>
                              )}
                            </>
                          )}
                          
                          {/* Time & Status */}
                          <div className={`mt-1 flex items-center gap-2 text-[10px] ${isMine ? "text-cyan-100 justify-end" : "text-slate-400"}`}>
                            {formatTime(message.created)}
                            {isMine && !message.delete_msg && (
                              <button onClick={() => softDeleteCommunityMessage(selectedGroup.id, message.id, getAccessToken()!)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={12} className="text-cyan-200 hover:text-white" />
                              </button>
                            )}
                          </div>
                        </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input Area */}
              <footer className="p-4 bg-white border-t border-slate-50">
                <form onSubmit={onSend} className="flex items-center gap-2 max-w-4xl mx-auto">
                  <div className="relative flex-1">
                    <input
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      placeholder={amMember ? "Write your message..." : "Join group to chat"}
                      disabled={!amMember || sending}
                      className="w-full rounded-2xl border-none bg-slate-100 py-3.5 pl-5 pr-12 text-sm focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50"
                    />
                  </div>
                  <button
                    disabled={!amMember || !composer.trim() || sending}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-200 transition-all hover:bg-cyan-700 disabled:grayscale disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                </form>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-10">
              <div className="mb-4 rounded-3xl bg-slate-50 p-6">
                <Users size={48} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Select a community</h3>
              <p className="text-sm text-slate-500 max-w-xs">Pick a group from the left to start chatting with other members.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}