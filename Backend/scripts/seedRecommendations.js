//fills the Recommendations feed with mock posts from 10 fake users, for
//trying the page out. uses games and achievements already cached in the
//Games collection (no steam api requests). post screenshots and avatars are
//generated pictures; achievement pictures combine the game's banner and the
//achievement's icon, downloaded from steam's image cdn
//
//  node scripts/seedRecommendations.js           replace the mock data
//  node scripts/seedRecommendations.js --remove  delete the mock data
//
//everything it writes is marked seed: true, so it never touches real posts.
//the fake users are only post authors: they have no accounts and can't sign in

const mc = require("mongodb");
const sharp = require("sharp");

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:5011";
const DAY_MS = 24 * 60 * 60 * 1000;

//a seeded random number generator, so every run makes the same mock data
let rngState = 20261109;
const random = () => {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
};
const pick = (list) => list[Math.floor(random() * list.length)];
const pickSome = (list, n) => {
  const copy = [...list];
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(random() * copy.length), 1)[0]);
  }
  return out;
};

// ---- the fake users and what they posted ----

const USERS = [
  { key: "nova", name: "NovaRunner", colors: ["#7c3aed", "#22d3ee"] },
  { key: "brick", name: "BrickHouse", colors: ["#b45309", "#fde68a"] },
  { key: "moss", name: "mossy_controller", colors: ["#15803d", "#bbf7d0"] },
  { key: "kite", name: "Kitefighter", colors: ["#0369a1", "#f0abfc"] },
  { key: "oat", name: "OatmealPaladin", colors: ["#a16207", "#fef9c3"] },
  { key: "zed", name: "zed_does_speedruns", colors: ["#be123c", "#fecdd3"] },
  { key: "pip", name: "PipTheBard", colors: ["#4338ca", "#c7d2fe"] },
  { key: "rust", name: "RustBucket", colors: ["#9a3412", "#fdba74"] },
  { key: "luna", name: "LunaLogs", colors: ["#334155", "#e2e8f0"] },
  { key: "fig", name: "fig_jam", colors: ["#86198f", "#f5d0fe"] },
];

//[user, app id, score (null = none), text, achievements to highlight, screenshots]
//post counts per user: nova 9, brick 7, moss 6, kite 5, oat 4, zed 3,
//pip 2, rust 2, luna 1, fig 1 (40 total)
const POSTS = [
  ["nova", 813230, 10, "Go in blind. That's the whole recommendation.", 2, 1],
  ["nova", 2379780, 9, "One more run turned into 3am. Again.", 1, 0],
  ["nova", 212680, 8, "Brutal but fair. Every loss teaches you something.", 2, 0],
  ["nova", 250900, 9, "Hundreds of hours and it still surprises me.", 3, 1],
  ["nova", 632470, 10, "The best writing I've seen in a game. Talk to everyone, fail every check, it's all good.", 1, 0],
  ["nova", 814380, 8, "Parry or die. Once it clicks it's pure rhythm.", 2, 1],
  ["nova", 785790, 7, "Dumb in the best way. Short, but I laughed the whole time.", 1, 0],
  ["nova", 701160, null, "Chill until it really, really isn't.", 1, 0],
  ["nova", 386940, 8, "Ruined a friendship for about ten minutes. Highly recommend.", 0, 0],

  ["brick", 440, 7, "Still the most fun class shooter. Just play on community servers.", 2, 0],
  ["brick", 49520, 8, "Co-op loot chaos. The writing is a lot, but the guns are great.", 2, 1],
  ["brick", 252950, 6, "Easy to pick up, impossible to master. I am bad at it and I love it.", 1, 0],
  ["brick", 553850, 9, "Friendly fire is a feature. Bring three friends and an apology.", 2, 1],
  ["brick", 2073850, 6, "Fast, loud, everything explodes. Matchmaking can be rough.", 0, 0],
  ["brick", 291550, null, "Good free fighter to play with people who don't play fighters.", 1, 0],
  ["brick", 268500, 8, "Missed a 95% shot, threw my controller, played until sunrise anyway.", 2, 0],

  ["moss", 282070, 9, "Not fun exactly, but it stuck with me for weeks.", 1, 0],
  ["moss", 211820, 7, "Cozy space building. Lost a whole weekend to my farm.", 1, 1],
  ["moss", 275850, 8, "Night and day from launch. Great for zoning out and exploring.", 2, 1],
  ["moss", 427410, 8, "Office-building survival with friends is way funnier than it should be.", 2, 0],
  ["moss", 701160, 7, "Lovely pixel art, and the music is so relaxing.", 1, 0],
  ["moss", 523210, null, "Short and clever. Best played in one sitting with no guides.", 0, 0],

  ["kite", 502500, 9, "The best flying feels I've had in years. The missions get wild.", 2, 1],
  ["kite", 1142710, 7, "Huge and overwhelming. Watch a guide for your first faction.", 1, 0],
  ["kite", 270880, 8, "I didn't expect to find driving a truck across Nevada this relaxing.", 1, 1],
  ["kite", 268500, 9, "Every mission is a little story. Play with the timer mod if it stresses you.", 1, 0],
  ["kite", 292030, 10, "Do the side quests. Seriously, the side quests are the game.", 2, 0],

  ["oat", 230230, 8, "Old school RPG with real freedom. Co-op is a treat.", 2, 0],
  ["oat", 292030, 9, "Gwent took over my life for a month.", 1, 0],
  ["oat", 20920, 7, "Rougher than 3, but the story choices hit harder.", 1, 0],
  ["oat", 335300, 6, "Harder than it needs to be in places. Still worth it for the bosses.", 1, 0],

  ["zed", 250900, 8, "Good runs feel broken in the best way.", 2, 0],
  ["zed", 813230, 9, "The secrets go so much deeper than you think. Don't look anything up.", 1, 0],
  ["zed", 814380, 9, "Learned every boss's moveset by heart. No regrets.", 2, 0],

  ["pip", 632470, 10, "Read every line. Dance with the mailbox.", 1, 0],
  ["pip", 2379780, 8, "Poker with a sense of humor. Easy to learn, easy to lose sleep over.", 1, 0],

  ["rust", 251570, 6, "Janky but the horde nights with friends are unforgettable.", 1, 0],
  ["rust", 495420, 7, "Running a survivor base is weirdly satisfying.", 1, 0],

  ["luna", 1970580, 8, "Inventory management as a whole game, and it works.", 1, 0],

  ["fig", 95300, 7, "Short, hard, beautiful. Grappling hook physics are great.", 0, 0],
];

const UNLOCKED_COMMENTS = [
  "Took me way too many tries.",
  "Got this one by accident, honestly.",
  "Proudest moment of the whole game.",
  "Cheesed it a little. No regrets.",
  "Worth the grind.",
  "Finally! Two whole evenings on this one.",
  "Easier than it looks if you go in prepared.",
  "Popped on my first run and I yelled.",
  "",
];
const LOCKED_COMMENTS = [
  "Still haven't got this one. Someday.",
  "Gave up after an hour of trying.",
  "Not even close yet.",
  "Saving this for my second playthrough.",
  "How does anyone actually get this?",
  "Missed it and can't go back. Ugh.",
  "Working on it!",
  "",
];

// ---- generated pictures ----

const escapeXml = (text) =>
  text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

const shade = () =>
  `hsl(${Math.floor(random() * 360)}, ${40 + Math.floor(random() * 40)}%, ${25 + Math.floor(random() * 40)}%)`;

//a simple game-like scene: sky, hills, a sun or moon, and a little HUD
const screenshotSvg = (gameName) => {
  const w = 1280;
  const h = 720;
  const sky = [shade(), shade()];
  const layers = [0, 1, 2]
    .map((i) => {
      const base = 380 + i * 110;
      let d = `M0 ${h} L0 ${base}`;
      for (let x = 0; x <= w; x += 80) {
        d += ` L${x} ${base - Math.floor(random() * (140 - i * 30))}`;
      }
      return `<path d="${d} L${w} ${h} Z" fill="${shade()}" opacity="${0.75 + i * 0.1}"/>`;
    })
    .join("");
  const sunX = 150 + Math.floor(random() * 980);
  const sunY = 90 + Math.floor(random() * 160);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <circle cx="${sunX}" cy="${sunY}" r="${40 + Math.floor(random() * 40)}" fill="#fff7d6" opacity="0.85"/>
    ${layers}
    <rect x="28" y="28" width="260" height="22" rx="4" fill="#000" opacity="0.45"/>
    <rect x="31" y="31" width="${60 + Math.floor(random() * 190)}" height="16" rx="3" fill="#ef4444"/>
    <circle cx="${w - 90}" cy="90" r="58" fill="#000" opacity="0.35" stroke="#fff" stroke-opacity="0.5" stroke-width="3"/>
    <circle cx="${w - 90}" cy="90" r="6" fill="#facc15"/>
    <text x="28" y="${h - 30}" font-family="Arial, sans-serif" font-size="26" fill="#fff" opacity="0.8">${escapeXml(gameName)}</text>
  </svg>`;
};

//an identicon-style avatar: a mirrored 5x5 grid in the user's colours
const avatarSvg = ([bg, fg]) => {
  const cells = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (random() < 0.5) {
        cells.push([x, y]);
        if (x < 2) cells.push([4 - x, y]);
      }
    }
  }
  const rects = cells
    .map(([x, y]) => `<rect x="${12 + x * 32}" y="${12 + y * 32}" width="32" height="32" fill="${fg}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="184" height="184"><rect width="184" height="184" fill="${bg}"/>${rects}</svg>`;
};

const toWebp = async (svg) => {
  const { data, info } = await sharp(Buffer.from(svg))
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
};

// ---- achievement pictures from steam's image cdn ----
//these download the game's header banner and the achievement's icon (both
//plain images on steam's cdn, not api requests) and combine them into one
//picture: the banner blurred as a backdrop, the icon enlarged on top, and the
//achievement's name. a failed download just means no picture

//only these hosts are fetched, whatever the cached urls say
const CDN_HOSTS = /^(shared|cdn|steamcdn-a)\.(akamai|cloudflare|fastly)\.steamstatic\.com$|^steamcdn-a\.akamaihd\.net$/;
const MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024;
const downloads = new Map();
let downloadedBytes = 0;

//fetches each url once per run; null if it isn't a steam cdn image or fails
const download = (url) => {
  if (!downloads.has(url)) {
    downloads.set(
      url,
      (async () => {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:" || !CDN_HOSTS.test(parsed.hostname)) {
          return null;
        }
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) {
          return null;
        }
        const data = Buffer.from(await res.arrayBuffer());
        if (data.length > MAX_DOWNLOAD_BYTES) return null;
        downloadedBytes += data.length;
        return data;
      })().catch(() => null),
    );
  }
  return downloads.get(url);
};

const ACHIEVEMENT_W = 1280;
const ACHIEVEMENT_H = 720;
const ICON_SIZE = 256;

const achievementPicture = async (game, achievement, name) => {
  const [banner, icon] = await Promise.all([
    game.image ? download(game.image) : null,
    achievement.icon ? download(achievement.icon) : null,
  ]);
  if (!banner || !icon) return null;

  const backdrop = await sharp(banner)
    .resize(ACHIEVEMENT_W, ACHIEVEMENT_H, { fit: "cover" })
    .blur(18)
    .modulate({ brightness: 0.55 })
    .toBuffer();
  const enlargedIcon = await sharp(icon)
    .resize(ICON_SIZE, ICON_SIZE, { kernel: "lanczos3" })
    .toBuffer();
  const label = `<svg xmlns="http://www.w3.org/2000/svg" width="${ACHIEVEMENT_W}" height="${ACHIEVEMENT_H}">
    <rect x="${(ACHIEVEMENT_W - ICON_SIZE) / 2 - 8}" y="160" width="${ICON_SIZE + 16}" height="${ICON_SIZE + 16}" rx="16" fill="#000" opacity="0.4"/>
    <text x="50%" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#facc15" letter-spacing="4">ACHIEVEMENT UNLOCKED</text>
    <text x="50%" y="580" text-anchor="middle" font-family="Arial, sans-serif" font-size="46" font-weight="bold" fill="#fff">${escapeXml(name.slice(0, 40))}</text>
  </svg>`;

  const { data, info } = await sharp(backdrop)
    .composite([
      { input: Buffer.from(label), top: 0, left: 0 },
      {
        input: enlargedIcon,
        top: 168,
        left: (ACHIEVEMENT_W - ICON_SIZE) / 2,
      },
    ])
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
};

// ---- writing it all ----

const main = async () => {
  const client = await mc.MongoClient.connect("mongodb://localhost:27017");
  const db = client.db("Steam-Stats");
  const recommendations = db.collection("Recommendations");
  const images = db.collection("RecommendationImages");

  const removed = await recommendations.deleteMany({ seed: true });
  const removedImages = await images.deleteMany({ seed: true });
  console.log(
    `removed ${removed.deletedCount} mock posts and ${removedImages.deletedCount} mock images`,
  );
  if (process.argv.includes("--remove")) return client.close();

  const appIds = [...new Set(POSTS.map((p) => p[1]))];
  const games = new Map(
    (await db.collection("Games").find({ _id: { $in: appIds } }).toArray()).map(
      (g) => [g._id, g],
    ),
  );
  const missing = appIds.filter((id) => !games.has(id));
  if (missing.length) {
    throw new Error(
      `these games aren't cached in Games yet: ${missing.join(", ")}`,
    );
  }

  const saveImage = async (ownerId, postId, picture) => {
    const { insertedId } = await images.insertOne({
      ownerId,
      postId,
      data: new mc.Binary(picture.data),
      contentType: "image/webp",
      width: picture.width,
      height: picture.height,
      size: picture.data.length,
      createdAt: new Date(),
      seed: true,
    });
    return { id: String(insertedId), width: picture.width, height: picture.height };
  };

  //one avatar per user; postId is a stand-in so the image is served to everyone
  const authors = new Map();
  for (const u of USERS) {
    const authorId = `${u.key}@example.test`;
    const avatar = await saveImage(
      authorId,
      new mc.ObjectId(),
      await toWebp(avatarSvg(u.colors)),
    );
    authors.set(u.key, {
      authorId,
      author: {
        steamId: `seed-${u.key}`,
        name: u.name,
        avatar: `${BACKEND_ORIGIN}/recommendations/images/${avatar.id}`,
      },
    });
  }

  let screenshotCount = 0;
  let achievementImageCount = 0;
  for (const [userKey, appId, score, body, highlightCount, shots] of POSTS) {
    const game = games.get(appId);
    const { authorId, author } = authors.get(userKey);
    const postId = new mc.ObjectId();

    const postImages = [];
    for (let i = 0; i < shots; i++) {
      postImages.push(
        await saveImage(authorId, postId, await toWebp(screenshotSvg(game.name))),
      );
      screenshotCount++;
    }

    const achievements = [];
    for (const a of pickSome(game.achievements ?? [], highlightCount)) {
      const unlocked = random() < 0.6;
      const name = a.displayName ?? a.name;
      //about half of the unlocked ones get a picture of the moment
      const picture =
        unlocked && random() < 0.6
          ? await achievementPicture(game, a, name)
          : null;
      const achievementImages = picture
        ? [await saveImage(authorId, postId, picture)]
        : [];
      achievementImageCount += achievementImages.length;
      achievements.push({
        apiName: a.name,
        name,
        description: a.description ?? "",
        icon: a.icon,
        iconGray: a.icongray,
        unlocked,
        comment: pick(unlocked ? UNLOCKED_COMMENTS : LOCKED_COMMENTS),
        images: achievementImages,
      });
    }

    await recommendations.insertOne({
      _id: postId,
      authorId,
      author,
      game: { id: game._id, name: game.name, image: game.image },
      body,
      score,
      images: postImages,
      achievements,
      //spread over the last six weeks
      createdAt: new Date(Date.now() - Math.floor(random() * 42 * DAY_MS)),
      seed: true,
    });
  }

  console.log(
    `added ${POSTS.length} mock posts from ${USERS.length} users, with ${screenshotCount} screenshots and ${achievementImageCount} achievement images`,
  );
  console.log(
    `downloaded ${downloads.size} files (${(downloadedBytes / 1024).toFixed(0)} KB) from steam's image cdn`,
  );
  await client.close();
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
