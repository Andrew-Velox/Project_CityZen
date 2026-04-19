"use client";

import { FormEvent } from "react";
import { motion } from "framer-motion";
import { Search, LogOut, Plus, Loader2 } from "lucide-react";
import type { CommunityGroup, CommunityMessage, UserProfile } from "@/lib/api/types";

function formatPreview(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : `${date.toLocaleDateString([], { weekday: "short" })}, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
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

function ConvRow({ name, avatarSrc, preview, time, unread, online, selected, onClick }: {
  name: string;
  avatarSrc?: string | null;
  preview: string;
  time: string;
  unread?: number;
  online?: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.985 }}
      className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all duration-150 ${
        selected ? "bg-white/72 border border-white/80 shadow-sm" : "hover:bg-white/55 border border-transparent"
      }`}
    >
      <Avatar src={avatarSrc} name={name} size="sm" online={online} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-[13px] font-semibold text-slate-700">{name}</span>
          <span className="shrink-0 text-[10px] text-slate-400">{time}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <p className="truncate text-[11px] text-slate-500">{preview}</p>
          {(unread ?? 0) > 0 && (
            <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-400 px-1 text-[9px] font-bold text-slate-900">
              {unread}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

type CommunitySidebarProps = {
  mobileSidebarOpen: boolean;
  onCloseMobileSidebar: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  canCreateGroups: boolean;
  newGroupName: string;
  creatingGroup: boolean;
  onNewGroupNameChange: (value: string) => void;
  onCreateGroup: (e: FormEvent) => void;
  groups: CommunityGroup[];
  selectedGroupId: number | null;
  messages: CommunityMessage[];
  getGroupBannerUrl: (group: CommunityGroup) => string | null;
  onSelectGroup: (groupId: number) => void;
  profile: UserProfile | null;
  onLogout: () => void;
};

export function CommunitySidebar({
  mobileSidebarOpen,
  onCloseMobileSidebar,
  search,
  onSearchChange,
  canCreateGroups,
  newGroupName,
  creatingGroup,
  onNewGroupNameChange,
  onCreateGroup,
  groups,
  selectedGroupId,
  messages,
  getGroupBannerUrl,
  onSelectGroup,
  profile,
  onLogout,
}: CommunitySidebarProps) {
  return (
    <>
      <aside
        className={`absolute inset-y-0 left-0 z-30 flex h-full w-[76vw] max-w-[270px] flex-col transition-transform duration-300 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:static md:z-0 md:w-full md:max-w-none md:translate-x-0`}
        style={{ background: "rgba(255,255,255,0.34)", backdropFilter: "blur(24px) saturate(125%)" }}
      >
        <div className="flex h-full flex-col gap-3 p-3">
          <div className="relative">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search"
              className="w-full rounded-xl py-2.5 pl-9 pr-3 text-[12.5px] text-slate-700 placeholder-slate-400 outline-none transition"
              style={{ background: "rgba(255,255,255,0.58)", border: "1px solid rgba(255,255,255,0.72)" }}
            />
          </div>

          <div className="space-y-1">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Groups</span>
              {canCreateGroups && (
                <form onSubmit={onCreateGroup} className="flex items-center gap-1">
                  <input
                    value={newGroupName}
                    onChange={(e) => onNewGroupNameChange(e.target.value)}
                    placeholder="New..."
                    className="w-20 rounded-lg px-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 outline-none"
                    style={{ background: "rgba(255,255,255,0.58)", border: "1px solid rgba(255,255,255,0.72)" }}
                  />
                  <button
                    type="submit"
                    disabled={creatingGroup || !newGroupName.trim()}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-teal-400 transition hover:bg-teal-400/10 disabled:opacity-40"
                    style={{ background: "rgba(20,184,166,0.12)" }}
                  >
                    {creatingGroup ? <Loader2 size={11} className="animate-spin" /> : <Plus size={12} />}
                  </button>
                </form>
              )}
            </div>

            <div
              className="space-y-0.5 rounded-2xl p-2"
              style={{ background: "rgba(255,255,255,0.34)", border: "1px solid rgba(255,255,255,0.58)", backdropFilter: "blur(14px)" }}
            >
              {groups.length === 0 ? (
                <p className="py-2 text-center text-[11px] text-slate-400">No groups</p>
              ) : (
                groups.map((group, index) => {
                  const name = group.groupchat_name || group.group_name;
                  const isSelected = selectedGroupId === group.id;
                  const last = isSelected ? messages[messages.length - 1] : null;

                  return (
                    <motion.div key={group.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                      <ConvRow
                        name={name}
                        avatarSrc={getGroupBannerUrl(group)}
                        preview={last ? last.body || "Attachment" : `${group.members.length} members`}
                        time={last ? formatPreview(last.created) : "Today"}
                        online={group.users_online.length > 0}
                        selected={isSelected}
                        onClick={() => {
                          onSelectGroup(group.id);
                          onCloseMobileSidebar();
                        }}
                      />
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex-1" />

          <div
            className="flex items-center justify-between rounded-xl px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.42)", border: "1px solid rgba(255,255,255,0.62)", backdropFilter: "blur(14px)" }}
          >
            <div className="min-w-0 flex items-center gap-2.5">
              <Avatar src={null} name={profile?.username || "?"} size="xs" online />
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-slate-700">{profile?.username || "Guest"}</p>
                <p className="text-[10px] text-emerald-600/75">Online</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onLogout}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:text-red-500"
              style={{ background: "rgba(255,255,255,0.6)" }}
            >
              <LogOut size={13} />
            </motion.button>
          </div>
        </div>
      </aside>

      {mobileSidebarOpen && (
        <motion.button
          key="ov"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-20 md:hidden"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={onCloseMobileSidebar}
        />
      )}
    </>
  );
}
