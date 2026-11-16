"use client";

import { useMemo, useState, useEffect } from "react";
import axios from "axios";
import type { FriendStatus } from "@/lib/mock-data";
import { PlayerCard } from "@/components/player-card";
import { useAuth } from "@/lib/auth";
import { PixelateFilter } from "@/components/pixelate-filter";

type Node = {
  steamid: string;
  name: string;
  avatar: string;
  status: FriendStatus;
  censored: boolean;
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
  // flagged username: name arrives as asterisks, avatar is pixelated here
  censored?: boolean;
  mutualFriendIds: string[];
};

type Edge = { a: string; b: string };

// ---- Concentric ring layout ----
// Each portrait (plus its name label) is bounded by a "footprint" circle
// centred on the portrait. Rings and slots are spaced so no two footprints
// can ever intersect, which guarantees portraits and labels never overlap.
const NODE_R = 26;
const USER_R = 42;
const NODE_LABEL_CHARS = 11; // ~76px wide at 12px bold
const USER_LABEL_CHARS = 14; // ~126px wide at 16px bold
// Distance from a node's centre to the far corner of its label box.
const NODE_FOOTPRINT = 62;
const USER_FOOTPRINT = 92;
const GAP = 6;
// Minimum centre-to-centre distance between any two friend nodes.
const MIN_SPACING = NODE_FOOTPRINT * 2 + GAP;
const FIRST_RING = USER_FOOTPRINT + NODE_FOOTPRINT + GAP;
const MARGIN = 12;

/** How many nodes fit on a ring of this radius with chord >= MIN_SPACING. */
function ringCapacity(radius: number) {
  return Math.max(
    1,
    Math.floor(Math.PI / Math.asin(Math.min(1, MIN_SPACING / (2 * radius)))),
  );
}

/** Split `count` nodes into rings, filling inner rings first. */
function buildRings(count: number) {
  const rings: { radius: number; count: number }[] = [];
  let remaining = count;
  let radius = FIRST_RING;
  while (remaining > 0) {
    const take = Math.min(remaining, ringCapacity(radius));
    rings.push({ radius, count: take });
    remaining -= take;
    // Rings are MIN_SPACING apart, so nodes on different rings are too.
    radius += MIN_SPACING;
  }
  return rings;
}

const truncate = (s: string, max: number) =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s;

const statusOrder = (s: FriendStatus) => (s === "Offline" ? 1 : 0);

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
  //RequireSteamKey only renders this once the user has a steam id
  const steamId = useAuth().user?.steamId ?? null;
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [friends, setFriends] = useState<UserData[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (steamId === null) return;
    console.log("loading");
    try {
      axios
        .get("http://localhost:5011/friendWeb/getFriends/", {
          params: {
            steamid: steamId,
          },
          withCredentials: true,
        })
        .then((response) => {
          setCurrentUser(response.data.user);
          setFriends(response.data.friends);
          // The user starts out selected so their connections are shown.
          setSelected(response.data.user?.steamid ?? null);
          setLoaded(true);
        });
    } catch (err) {
      console.log(err);
    }
  }, [steamId]);

  const rings = useMemo(() => buildRings(friends?.length ?? 0), [friends]);

  // Square canvas just big enough for the outermost ring.
  const outerRadius = rings.length
    ? rings[rings.length - 1].radius + NODE_FOOTPRINT
    : USER_FOOTPRINT;
  const SIZE = Math.ceil((outerRadius + MARGIN) * 2);
  const CX = SIZE / 2;
  const CY = SIZE / 2;

  const nodes = useMemo<Node[]>(() => {
    if (currentUser === null || friends === null) return [];

    // Online friends go on the inner rings.
    const ordered = [...friends].sort(
      (a, b) => statusOrder(a.status) - statusOrder(b.status),
    );

    const friendNodes: Node[] = [];
    let i = 0;
    rings.forEach((ring, ringIndex) => {
      const step = (Math.PI * 2) / ring.count;
      // Stagger alternate rings so portraits don't line up in spokes.
      const offset = -Math.PI / 2 + (ringIndex % 2 ? step / 2 : 0);
      for (let slot = 0; slot < ring.count; slot++, i++) {
        const f = ordered[i];
        const angle = offset + slot * step;
        friendNodes.push({
          steamid: f.steamid,
          name: f.username,
          avatar: f.avatar,
          status: f.status,
          censored: f.censored === true,
          x: CX + Math.cos(angle) * ring.radius,
          y: CY + Math.sin(angle) * ring.radius,
          r: NODE_R,
          isUser: false,
        });
      }
    });

    return [
      {
        steamid: currentUser.steamid,
        name: currentUser.username,
        avatar: currentUser.avatar,
        status: currentUser.status,
        censored: currentUser.censored === true,
        x: CX,
        y: CY,
        r: USER_R,
        isUser: true,
      },
      ...friendNodes,
    ];
  }, [currentUser, friends, rings, CX, CY]);

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
      const known = new Set(friends.map((f) => f.steamid));
      friends.forEach((f) =>
        (f.mutualFriendIds ?? []).forEach(
          (m) => known.has(m) && add(f.steamid, m),
        ),
      );
    }
    return list;
  }, [friends, currentUser]);

  const nodeById = useMemo(() => {
    const map = new Map<string, Node>();
    nodes.forEach((n) => map.set(n.steamid, n));
    return map;
  }, [nodes]);

  // Outline highlight follows hover, falling back to the selection.
  const active = hovered ?? selected;
  // Connections are shown for the hovered node, otherwise for whoever is
  // selected (the user by default).
  const lineSource = hovered ?? selected;
  const neighborIds = useMemo(() => {
    if (!lineSource) return null;
    const set = new Set<string>([lineSource]);
    edges.forEach((e) => {
      if (e.a === lineSource) set.add(e.b);
      if (e.b === lineSource) set.add(e.a);
    });
    return set;
  }, [lineSource, edges]);

  const isSpoke = (e: Edge) =>
    currentUser != null &&
    (e.a === currentUser.steamid || e.b === currentUser.steamid);
  const isEdgeActive = (e: Edge) =>
    lineSource != null && (e.a === lineSource || e.b === lineSource);
  const visibleEdges = edges.filter(isEdgeActive);
  const isNodeDimmed = (id: string) =>
    neighborIds != null && !neighborIds.has(id);

  const selectedNode = selected ? nodeById.get(selected) : undefined;

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
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="relative h-auto w-full"
            role="img"
            aria-label="Friend network graph. Select a node to see details."
          >
            {/* ring guides */}
            <g fill="none" stroke="var(--border)" strokeOpacity={0.6}>
              {rings.map((ring) => (
                <circle
                  key={ring.radius}
                  cx={CX}
                  cy={CY}
                  r={ring.radius}
                  strokeWidth={1.25}
                  strokeDasharray="4 6"
                />
              ))}
            </g>

            {/* edges: only the hovered node's links (or the user's while the
                user is selected). Spokes are drawn first, mutual links on top. */}
            <g stroke="var(--primary)">
              {[...visibleEdges]
                .sort((x, y) => Number(!isSpoke(x)) - Number(!isSpoke(y)))
                .map((e) => {
                  const a = nodeById.get(e.a);
                  const b = nodeById.get(e.b);
                  if (!a || !b) return null;
                  const spoke = isSpoke(e);
                  return (
                    <line
                      key={`${e.a}-${e.b}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      strokeOpacity={spoke ? 0.55 : 0.9}
                      strokeWidth={spoke ? 1.25 : 2}
                    />
                  );
                })}
            </g>

            <defs>
              {/* blocks of 9 units leave a friend avatar ~6 blocks across */}
              <PixelateFilter id="pixelate-node" size={9} />
              {nodes.map((n) => (
                // in the avatar's own coordinates, see the <image> below
                <clipPath key={n.steamid} id={`clip-${n.steamid}`}>
                  <circle cx={n.r} cy={n.r} r={n.r} />
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
                  <title>{n.name}</title>
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
                  {/* placed with a transform so its clip and the pixelate
                      filter work in coordinates starting at the avatar's
                      corner; the filter's grid is absolute and would fall
                      outside an avatar drawn at x/y */}
                  <image
                    href={n.avatar}
                    x={0}
                    y={0}
                    transform={`translate(${n.x - n.r} ${n.y - n.r})`}
                    width={n.r * 2}
                    height={n.r * 2}
                    clipPath={`url(#clip-${n.steamid})`}
                    preserveAspectRatio="xMidYMid slice"
                    filter={n.censored ? "url(#pixelate-node)" : undefined}
                  />
                  {/* label */}
                  <text
                    x={n.x}
                    y={n.y + n.r + (n.isUser ? 22 : 18)}
                    textAnchor="middle"
                    fontSize={n.isUser ? 16 : 12}
                    fontWeight={600}
                    fill="var(--foreground)"
                  >
                    {truncate(
                      n.name,
                      n.isUser ? USER_LABEL_CHARS : NODE_LABEL_CHARS,
                    )}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Player card for the selected node */}
        {selectedNode && (
          <PlayerCard
            steamid={selectedNode.steamid}
            fallback={{
              username: selectedNode.name,
              avatar: selectedNode.avatar,
              censored: selectedNode.censored,
            }}
            isUser={selectedNode.isUser}
            friendOf={currentUser?.steamid}
            className="lg:sticky lg:top-4 lg:self-start"
          />
        )}
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
