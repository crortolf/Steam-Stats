"use client";

import { useMemo, useState, useEffect } from "react";
import axios from "axios";
import Image from "next/image";
import { MapPin, Users, Gamepad2 } from "lucide-react";
import {
  getGame,
  getFriend,
  statusLabel,
  type FriendStatus,
} from "@/lib/mock-data";
import { StatusDot } from "@/components/status-dot";
import { Badge } from "@/components/ui/badge";

type Node = {
  steamid: string;
  name: string;
  avatar: string;
  status: FriendStatus;
  x: number;
  y: number;
  r: number;
  isUser: boolean;
};

type UserData = {
  username: string;
  steamid: string;
  avatar: string;
  status: FriendStatus;
  mutualFriendIds: string[];
};

type Edge = { a: string; b: string };

const W = 800;
const H = 620;
const CX = W / 2;
const CY = H / 2;

const statusStroke: Record<FriendStatus, string> = {
  Online: "var(--status-Online)",
  Offline: "var(--status-Offline)",
  Away: "var(--status-Offline)",
  "Looking to play": "var(--status-Offline)",
  "Looking to trade": "var(--status-Offline)",
  Busy: "var(--status-Offline)",
  Snooze: "var(--status-Offline)",
};

export function FriendNetwork() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>("u0");
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [friends, setFriends] = useState<UserData[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    console.log("loading");
    try {
      axios
        .get("http://localhost:5011/friendWeb/getFriends/", {
          params: {
            steamid: "76561198045843433",
          },
        })
        .then((response) => {
          setCurrentUser(response.data.user);
          setFriends(response.data.friends);
          setLoaded(true);
        });
    } catch (err) {
      console.log(err);
    }
  }, []);

  const nodes = useMemo<Node[]>(() => {
    if (loaded && currentUser !== null && friends !== null) {
      const radius = 235;
      const friendNodes = friends.map((f, i) => {
        const angle = (i / friends.length) * Math.PI * 2 - Math.PI / 2;
        return {
          steamid: f.steamid,
          name: f.username,
          avatar: f.avatar,
          status: f.status,
          x: CX + Math.cos(angle) * radius,
          y: CY + Math.sin(angle) * radius,
          r: 30,
          isUser: false,
        };
      });
      return [
        {
          steamid: currentUser.steamid,
          name: currentUser.username,
          avatar: currentUser.avatar,
          status: currentUser.status,
          x: CX,
          y: CY,
          r: 42,
          isUser: true,
        },
        ...friendNodes,
      ];
    } else return [];
  }, [loaded]);

  const edges = useMemo<Edge[]>(() => {
    const set = new Set<string>();
    const list: Edge[] = [];
    const add = (a: string, b: string) => {
      const key = [a, b].sort().join("|");
      if (set.has(key)) return;
      set.add(key);
      list.push({ a, b });
    };
    if (friends !== null && currentUser !== null) {
      // user connected to every friend
      friends.forEach((f) => add(currentUser.steamid, f.steamid));
      // mutual friend connections
      friends.forEach((f) =>
        f.mutualFriendIds.forEach((m) => add(f.steamid, m)),
      );
    }
    return list;
  }, []);

  const nodeById = useMemo(() => {
    const map = new Map<string, Node>();
    nodes.forEach((n) => map.set(n.steamid, n));
    return map;
  }, [nodes]);

  const active = hovered ?? selected;
  const neighborIds = useMemo(() => {
    if (!active) return null;
    const set = new Set<string>([active]);
    edges.forEach((e) => {
      if (e.a === active) set.add(e.b);
      if (e.b === active) set.add(e.a);
    });
    return set;
  }, [active, edges]);

  const isEdgeActive = (e: Edge) =>
    active != null && (e.a === active || e.b === active);
  const isNodeDimmed = (id: string) =>
    neighborIds != null && !neighborIds.has(id);

  const selectedFriend =
    selected && selected !== "u0" ? getFriend(selected) : undefined;
  const selectedGame = selectedFriend?.currentGameId
    ? getGame(selectedFriend.currentGameId)
    : undefined;

  if (!loaded) return;
  else
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Graph */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 50%, rgba(102,192,244,0.10), transparent 55%)",
            }}
            aria-hidden="true"
          />
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="relative h-auto w-full"
            role="img"
            aria-label="Friend network graph. Select a node to see details."
          >
            {/* edges */}
            <g>
              {edges.map((e) => {
                const a = nodeById.get(e.a)!;
                const b = nodeById.get(e.b)!;
                const activeEdge = isEdgeActive(e);
                return (
                  <line
                    key={`${e.a}-${e.b}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={activeEdge ? "var(--primary)" : "var(--border)"}
                    strokeOpacity={
                      active == null ? 0.5 : activeEdge ? 0.9 : 0.12
                    }
                    strokeWidth={activeEdge ? 2 : 1.25}
                  />
                );
              })}
            </g>

            <defs>
              {nodes.map((n) => (
                <clipPath key={n.steamid} id={`clip-${n.steamid}`}>
                  <circle cx={n.x} cy={n.y} r={n.r} />
                </clipPath>
              ))}
            </defs>

            {/* nodes */}
            {nodes.map((n) => {
              const dimmed = isNodeDimmed(n.steamid);
              const isActive = active === n.steamid;
              return (
                <g
                  key={n.steamid}
                  className="cursor-pointer"
                  opacity={dimmed ? 0.3 : 1}
                  onMouseEnter={() => setHovered(n.steamid)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(n.steamid)}
                  style={{ transition: "opacity 150ms" }}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r + 6}
                    fill="var(--card)"
                    stroke={
                      isActive ? "var(--primary)" : statusStroke[n.status]
                    }
                    strokeWidth={isActive ? 3 : 2}
                  />
                  <image
                    href={n.avatar}
                    x={n.x - n.r}
                    y={n.y - n.r}
                    width={n.r * 2}
                    height={n.r * 2}
                    clipPath={`url(#clip-${n.steamid})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                  {/* status dot */}
                  <circle
                    cx={n.x + n.r * 0.72}
                    cy={n.y + n.r * 0.72}
                    r={7}
                    fill={statusStroke[n.status]}
                    stroke="var(--card)"
                    strokeWidth={2.5}
                  />
                  {/* label */}
                  <text
                    x={n.x}
                    y={n.y + n.r + 20}
                    textAnchor="middle"
                    fontSize={n.isUser ? 16 : 13}
                    fontWeight={600}
                    fill="var(--foreground)"
                  >
                    {n.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* legend */}
          <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-popover/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
            <span className="flex items-center gap-1.5">
              <StatusDot status="Online" /> In-Game
            </span>
            <span className="flex items-center gap-1.5">
              <StatusDot status="Online" /> Online
            </span>
            <span className="flex items-center gap-1.5">
              <StatusDot status="Offline" /> Offline
            </span>
          </div>
        </div>

        {/* Detail panel */}
        <aside className="rounded-xl border border-border bg-card p-5">
          {selected === "u0" || !selectedFriend ? (
            //<UserPanel />
            <div />
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Image
                    src={selectedFriend.avatar || "/placeholder.svg"}
                    alt=""
                    width={64}
                    height={64}
                    className="rounded-md"
                  />
                  <StatusDot
                    status={selectedFriend.status}
                    className="absolute -bottom-1 -right-1 size-3.5 ring-2 ring-card"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-foreground">
                    {selectedFriend.name}{" "}
                    <span aria-hidden>{selectedFriend.countryFlag}</span>
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Level {selectedFriend.level} ·{" "}
                    {statusLabel[selectedFriend.status]}
                  </p>
                </div>
              </div>

              {selectedGame && (
                <div className="mt-4 flex items-center gap-2 rounded-md border border-status-Online/30 bg-status-Online/10 px-3 py-2 text-sm">
                  <Gamepad2 className="size-4 text-status-Online" />
                  <span className="text-foreground">
                    Playing{" "}
                    <span className="font-medium">{selectedGame.title}</span>
                  </span>
                </div>
              )}

              <dl className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-secondary/40 p-3">
                  <dt className="text-xs text-muted-foreground">
                    Total playtime
                  </dt>
                  <dd className="mt-0.5 font-mono text-lg font-semibold text-foreground">
                    {selectedFriend.totalPlaytime.toLocaleString()}h
                  </dd>
                </div>
                <div className="rounded-md bg-secondary/40 p-3">
                  <dt className="text-xs text-muted-foreground">
                    Mutual friends
                  </dt>
                  <dd className="mt-0.5 font-mono text-lg font-semibold text-foreground">
                    {selectedFriend.mutualFriendIds.length}
                  </dd>
                </div>
              </dl>

              <div className="mt-5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Users className="size-3.5" /> Mutual connections
                </p>
                <ul className="flex flex-col gap-1">
                  {selectedFriend.mutualFriendIds.map((mid) => {
                    const mf = getFriend(mid);
                    if (!mf) return null;
                    return (
                      <li key={mid}>
                        <button
                          type="button"
                          onClick={() => setSelected(mid)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-secondary/60"
                        >
                          <Image
                            src={mf.avatar || "/placeholder.svg"}
                            alt=""
                            width={28}
                            height={28}
                            className="rounded"
                          />
                          <span className="text-sm text-foreground">
                            {mf.name}
                          </span>
                          <StatusDot status={mf.status} className="ml-auto" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </aside>
      </div>
    );
}

// function UserPanel() {
//   const Online = friends.filter((f) => f.status === "Online").length;
//   return (
//     <div>
//       <div className="flex items-center gap-3">
//         <div className="relative">
//           <Image
//             src={currentUser.avatar || "/placeholder.svg"}
//             alt=""
//             width={64}
//             height={64}
//             className="rounded-md ring-2 ring-primary"
//           />
//           <StatusDot
//             status={currentUser.status}
//             className="absolute -bottom-1 -right-1 size-3.5 ring-2 ring-card"
//           />
//         </div>
//         <div className="min-w-0">
//           <h2 className="truncate text-lg font-semibold text-foreground">
//             {currentUser.name}{" "}
//             <span aria-hidden>{currentUser.countryFlag}</span>
//           </h2>
//           <Badge className="mt-1 bg-primary/15 text-primary hover:bg-primary/15">
//             You
//           </Badge>
//         </div>
//       </div>
//       <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
//         This is your network. Select any node to explore that friend&apos;s
//         profile and their mutual connections. Hover to highlight who&apos;s
//         linked.
//       </p>
//       <dl className="mt-5 grid grid-cols-2 gap-3">
//         <div className="rounded-md bg-secondary/40 p-3">
//           <dt className="text-xs text-muted-foreground">Total friends</dt>
//           <dd className="mt-0.5 font-mono text-lg font-semibold text-foreground">
//             {friends.length}
//           </dd>
//         </div>
//         <div className="rounded-md bg-secondary/40 p-3">
//           <dt className="text-xs text-muted-foreground">In-game now</dt>
//           <dd className="mt-0.5 font-mono text-lg font-semibold text-status-Online">
//             {Online}
//           </dd>
//         </div>
//       </dl>
//       <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
//         <MapPin className="size-3.5" /> Member since {currentUser.memberSince}
//       </p>
//     </div>
//   );
// }
