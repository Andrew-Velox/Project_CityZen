"use client";

import Link from "next/link";
import { FormEvent, type MutableRefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Paperclip, Users, Smile, Image as ImageIcon, Loader2, Wifi, WifiOff, CheckCheck, Trash2, X } from "lucide-react";
import { API_BASE_URL } from "@/config/api";
import type { CommunityGroup, CommunityMessage, UserProfile } from "@/lib/api/types";

function toAbsoluteUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function getProfileHref(message: CommunityMessage) {
  const profileUrl = message.author_profile_url;
  if (profileUrl?.startsWith("/") || profileUrl?.startsWith("http")) return profileUrl;
  return `/profile?user=${encodeURIComponent(message.author_username || "")}`;
}

function formatTime(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const COLORS = ["from-teal-400 to-cyan-600", "from-emerald-400 to-teal-600", "from-cyan-400 to-sky-600", "from-sky-400 to-indigo-500"];

function Avatar({ src, name, size = "sm", online }: { src?: string | null; name: string; size?: "xs" | "sm" | "md"; online?: boolean }) {
  const d = { xs: "h-8 w-8", sm: "h-10 w-10", md: "h-12 w-12" };
  const f = { xs: "text-[10px]", sm: "text-xs", md: "text-sm" };
  const dot = { xs: "h-2 w-2 border", sm: "h-2.5 w-2.5 border-2", md: "h-3 w-3 border-2" };
  const ci = name.charCodeAt(0) % COLORS.length;

  return (
    <div className={`relative shrink-0 ${d[size]}`}>
      <div className={`${d[size]} overflow-hidden rounded-full`}>
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${COLORS[ci]}`}>
            <span className={`${f[size]} font-bold text-white`}>{name[0]?.toUpperCase()}</span>
          </div>
        )}
      </div>
      {online !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 ${dot[size]} rounded-full border-[#0a1f24] ${online ? "bg-emerald-400" : "bg-slate-500/70"}`} />
      )}
    </div>
  );
}

function Bubble({ message, isMine, showName, onDelete }: {
  message: CommunityMessage;
  isMine: boolean;
  showName: boolean;
  onDelete: () => void;
}) {
  const imageSrc = toAbsoluteUrl(message.author_image || null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.34, 1.1, 0.64, 1] }}
      className={`group flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}
    >
      <div className={`mb-0.5 w-7 shrink-0 ${isMine ? "invisible" : ""}`}>
        {!isMine && showName && (
          <Link href={getProfileHref(message)}>
            <Avatar src={imageSrc} name={message.author_username} size="xs" />
          </Link>
        )}
      </div>

      <div className={`flex max-w-[60%] flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
        {showName && !isMine && (
          <span className="px-1 text-[10px] font-semibold text-slate-500">{message.author_username}</span>
        )}

        <div
          className={`relative rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
            isMine
              ? "rounded-br-[4px] border border-teal-200/80 bg-teal-100/70 text-slate-800 shadow-sm backdrop-blur-md"
              : "rounded-bl-[4px] border border-white/78 bg-white/58 text-slate-700 shadow-sm backdrop-blur-md"
          }`}
        >
          {message.delete_msg ? (
            <span className="text-xs italic text-slate-400">Message deleted</span>
          ) : (
            <>
              <p className="whitespace-pre-wrap">{message.body}</p>
              {message.file && (
                <a
                  href={toAbsoluteUrl(message.file)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-2 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition hover:opacity-80 ${
                    isMine ? "bg-teal-200/70 text-teal-800" : "bg-slate-100/80 text-slate-600"
                  }`}
                >
                  <Paperclip size={11} /> {message.filename || "Attachment"}
                </a>
              )}
            </>
          )}
        </div>

        <div className={`flex items-center gap-1.5 px-1 ${isMine ? "flex-row-reverse" : ""}`}>
          <span className="text-[10px] text-slate-400">{formatTime(message.created)}</span>
          {isMine && !message.delete_msg && <CheckCheck size={12} className="text-teal-600/70" />}
          {isMine && !message.delete_msg && (
            <button onClick={onDelete} className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Trash2 size={11} className="text-slate-400 transition-colors hover:text-red-500" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

type CommunityChatPanelProps = {
  selectedGroup: CommunityGroup | null;
  groupName: string;
  getGroupBannerUrl: (group: CommunityGroup) => string | null;
  mobileSidebarOpen: boolean;
  onOpenMobileSidebar: () => void;
  wsConnected: boolean;
  membershipUpdating: boolean;
  amMember: boolean;
  onToggleMembership: () => void;
  error: string | null;
  onClearError: () => void;
  messages: CommunityMessage[];
  messagesLoading: boolean;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  profile: UserProfile | null;
  onDelete: (groupId: number, messageId: number) => void;
  composer: string;
  onComposerChange: (value: string) => void;
  onSend: (e: FormEvent) => void;
  sending: boolean;
};

export function CommunityChatPanel({
  selectedGroup,
  groupName,
  getGroupBannerUrl,
  onOpenMobileSidebar,
  wsConnected,
  membershipUpdating,
  amMember,
  onToggleMembership,
  error,
  onClearError,
  messages,
  messagesLoading,
  scrollRef,
  profile,
  onDelete,
  composer,
  onComposerChange,
  onSend,
  sending,
}: CommunityChatPanelProps) {
  return (
    <section className="relative flex h-full min-w-0 flex-1 flex-col" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.2) 100%)", backdropFilter: "blur(22px)" }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/40 to-transparent" />
        <div className="absolute bottom-0 right-0 h-44 w-44 rounded-full bg-cyan-200/30 blur-3xl" />
      </div>

      {selectedGroup ? (
        <>
          <div
            className="flex shrink-0 items-center justify-between px-4 py-3 md:px-5"
            style={{ background: "rgba(255,255,255,0.42)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.6)" }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenMobileSidebar}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:text-slate-700 md:hidden"
                style={{ background: "rgba(255,255,255,0.58)", border: "1px solid rgba(255,255,255,0.72)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              </button>
              <Avatar src={getGroupBannerUrl(selectedGroup)} name={groupName} size="sm" online={selectedGroup.users_online.length > 0} />
              <div>
                <h2 className="text-[14px] font-bold text-slate-800">{groupName}</h2>
                <p className="text-[11px] text-teal-700/75">Online · Last seen {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div
                className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium sm:flex ${wsConnected ? "text-teal-400" : "text-amber-400"}`}
                style={{ background: wsConnected ? "rgba(20,184,166,0.1)" : "rgba(245,158,11,0.1)", border: wsConnected ? "1px solid rgba(20,184,166,0.15)" : "1px solid rgba(245,158,11,0.15)" }}
              >
                {wsConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
                <span>{wsConnected ? "Live" : "Reconnecting"}</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={onToggleMembership}
                disabled={membershipUpdating}
                className={`ml-0.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-all disabled:opacity-50 ${amMember ? "text-slate-600 hover:text-red-500" : "text-teal-700"}`}
                style={
                  amMember
                    ? { background: "rgba(255,255,255,0.58)", border: "1px solid rgba(255,255,255,0.72)" }
                    : { background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)" }
                }
              >
                {membershipUpdating ? <Loader2 size={13} className="animate-spin" /> : amMember ? "Joined ✓" : "Join"}
              </motion.button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex items-center justify-between px-5 py-2 text-xs text-red-400" style={{ background: "rgba(239,68,68,0.08)", borderBottom: "1px solid rgba(239,68,68,0.15)" }}>
                  <span>{error}</span>
                  <button onClick={onClearError}><X size={12} /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={scrollRef} className="scrollbar-none flex-1 space-y-3 overflow-y-auto p-4 md:p-5" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 100%)" }}>
            <AnimatePresence>
              {messages.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-1">
                  <span className="rounded-full px-3.5 py-1 text-[10px] text-slate-500" style={{ background: "rgba(255,255,255,0.58)", border: "1px solid rgba(255,255,255,0.72)" }}>
                    Today
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {messagesLoading && messages.length === 0 ? (
              <div className="flex justify-center py-20"><Loader2 size={22} className="animate-spin text-teal-500/30" /></div>
            ) : messages.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.58)", border: "1px solid rgba(255,255,255,0.72)" }}>
                  <Users size={22} className="text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">No messages yet</p>
                <p className="text-xs text-slate-400">Be the first to say something!</p>
              </motion.div>
            ) : (
              messages.map((message, index) => (
                <Bubble
                  key={message.id}
                  message={message}
                  isMine={profile?.id === message.author}
                  showName={index === 0 || messages[index - 1].author !== message.author}
                  onDelete={() => onDelete(selectedGroup.id, message.id)}
                />
              ))
            )}
          </div>

          <div className="shrink-0 px-4 py-3 md:px-5 md:py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.58)" }}>
            <form onSubmit={onSend} className="flex items-center gap-2.5">
              <div className="flex flex-1 items-center gap-2 rounded-2xl px-4 py-2.5 transition" style={{ background: "rgba(255,255,255,0.58)", border: "1px solid rgba(255,255,255,0.72)", backdropFilter: "blur(12px)" }}>
                <input
                  value={composer}
                  onChange={(e) => onComposerChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend(e as unknown as FormEvent);
                    }
                  }}
                  placeholder={amMember ? "Type your message here..." : "Join group to send messages"}
                  disabled={!amMember || sending}
                  className="flex-1 bg-transparent text-[13px] text-slate-700 placeholder-slate-400 outline-none disabled:opacity-40"
                />
                <div className="flex items-center gap-2">
                  <button type="button" className="text-slate-400 transition hover:text-teal-600/80"><Smile size={16} /></button>
                  <button type="button" className="text-slate-400 transition hover:text-teal-600/80"><ImageIcon size={16} /></button>
                </div>
              </div>
              <motion.button
                type="submit"
                disabled={!amMember || !composer.trim() || sending}
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.92 }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-teal-700 transition disabled:opacity-30"
                style={{ background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.3)", boxShadow: "0 4px 16px rgba(20,184,166,0.1)" }}
              >
                {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              </motion.button>
            </form>
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.15)" }}>
            <Users size={26} className="text-teal-400/40" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-600">Select a conversation</h3>
            <p className="mt-1 max-w-xs text-xs text-slate-500">Pick a group from the left panel to start chatting.</p>
          </div>
          <button
            onClick={onOpenMobileSidebar}
            className="mt-1 rounded-xl px-4 py-2 text-sm font-medium text-teal-700 transition hover:text-teal-800 md:hidden"
            style={{ background: "rgba(16,185,129,0.16)", border: "1px solid rgba(16,185,129,0.3)" }}
          >
            Browse channels
          </button>
        </motion.div>
      )}
    </section>
  );
}
