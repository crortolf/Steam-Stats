(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/site-nav.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SiteNav",
    ()=>SiteNav
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.0_@babel+core@7.2_e488ea4877697f6c405c0ecc7443a2d8/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.0_@babel+core@7.2_e488ea4877697f6c405c0ecc7443a2d8/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.0_@babel+core@7.2_e488ea4877697f6c405c0ecc7443a2d8/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.0_@babel+core@7.2_e488ea4877697f6c405c0ecc7443a2d8/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.0_@babel+core@7.2_e488ea4877697f6c405c0ecc7443a2d8/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$1$2e$17$2e$0_react$40$19$2e$2$2e$4$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@1.17.0_react@19.2.4/node_modules/lucide-react/dist/esm/icons/menu.mjs [app-client] (ecmascript) <export default as Menu>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$1$2e$17$2e$0_react$40$19$2e$2$2e$4$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@1.17.0_react@19.2.4/node_modules/lucide-react/dist/esm/icons/x.mjs [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mock-data.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$status$2d$dot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/status-dot.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
const links = [
    {
        href: "/network",
        label: "Friend Network"
    },
    {
        href: "/games",
        label: "Games & News"
    },
    {
        href: "/achievements",
        label: "Achievements"
    },
    {
        href: "/profile",
        label: "Profile"
    }
];
function SiteNav() {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: "sticky top-0 z-50 border-b border-border bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/80",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto flex h-14 max-w-7xl items-center gap-6 px-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: "flex items-center gap-2",
                        onClick: ()=>setOpen(false),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                src: "/favicon.ico",
                                alt: "Steam Stats Percent Icon",
                                width: 40,
                                height: 40,
                                className: "rounded"
                            }, void 0, false, {
                                fileName: "[project]/components/site-nav.tsx",
                                lineNumber: 31,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-lg font-semibold tracking-tight text-foreground",
                                children: "Steam Stats"
                            }, void 0, false, {
                                fileName: "[project]/components/site-nav.tsx",
                                lineNumber: 38,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/site-nav.tsx",
                        lineNumber: 26,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                        className: "hidden items-center gap-1 md:flex",
                        "aria-label": "Primary",
                        children: links.map((link)=>{
                            const active = pathname === link.href;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: link.href,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded px-3 py-2 text-sm font-medium transition-colors", active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"),
                                children: link.label
                            }, link.href, false, {
                                fileName: "[project]/components/site-nav.tsx",
                                lineNumber: 47,
                                columnNumber: 15
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/components/site-nav.tsx",
                        lineNumber: 43,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/profile",
                        className: "ml-auto hidden items-center gap-2 rounded px-2 py-1 hover:bg-secondary/60 md:flex",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        src: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["currentUser"].avatar || "/placeholder.svg",
                                        alt: "",
                                        width: 28,
                                        height: 28,
                                        className: "rounded"
                                    }, void 0, false, {
                                        fileName: "[project]/components/site-nav.tsx",
                                        lineNumber: 68,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$status$2d$dot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatusDot"], {
                                        status: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["currentUser"].status,
                                        className: "absolute -bottom-0.5 -right-0.5 ring-2 ring-popover"
                                    }, void 0, false, {
                                        fileName: "[project]/components/site-nav.tsx",
                                        lineNumber: 75,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/site-nav.tsx",
                                lineNumber: 67,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-sm font-medium text-foreground",
                                children: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["currentUser"].name
                            }, void 0, false, {
                                fileName: "[project]/components/site-nav.tsx",
                                lineNumber: 80,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/site-nav.tsx",
                        lineNumber: 63,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: "ml-auto grid size-9 place-items-center rounded text-muted-foreground hover:bg-secondary/60 hover:text-foreground md:hidden",
                        onClick: ()=>setOpen((v)=>!v),
                        "aria-label": open ? "Close menu" : "Open menu",
                        "aria-expanded": open,
                        children: open ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$1$2e$17$2e$0_react$40$19$2e$2$2e$4$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                            className: "size-5"
                        }, void 0, false, {
                            fileName: "[project]/components/site-nav.tsx",
                            lineNumber: 92,
                            columnNumber: 19
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$1$2e$17$2e$0_react$40$19$2e$2$2e$4$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__["Menu"], {
                            className: "size-5"
                        }, void 0, false, {
                            fileName: "[project]/components/site-nav.tsx",
                            lineNumber: 92,
                            columnNumber: 46
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/site-nav.tsx",
                        lineNumber: 85,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/site-nav.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this),
            open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                className: "border-t border-border bg-popover px-4 py-2 md:hidden",
                "aria-label": "Mobile",
                children: links.map((link)=>{
                    const active = pathname === link.href;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: link.href,
                        onClick: ()=>setOpen(false),
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block rounded px-3 py-2 text-sm font-medium", active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"),
                        children: link.label
                    }, link.href, false, {
                        fileName: "[project]/components/site-nav.tsx",
                        lineNumber: 104,
                        columnNumber: 15
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/components/site-nav.tsx",
                lineNumber: 97,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/site-nav.tsx",
        lineNumber: 24,
        columnNumber: 5
    }, this);
}
_s(SiteNav, "v3TFSdztexVkGEr5cLhcJl2cWfw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
_c = SiteNav;
var _c;
__turbopack_context__.k.register(_c, "SiteNav");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/status-dot.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StatusDot",
    ()=>StatusDot
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.0_@babel+core@7.2_e488ea4877697f6c405c0ecc7443a2d8/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
const colorByStatus = {
    Online: "bg-status-online",
    Offline: "bg-status-offline",
    Away: "bg-status-offline",
    "Looking to play": "bg-status-offline",
    "Looking to trade": "bg-status-offline",
    Busy: "bg-status-offline",
    Snooze: "bg-status-offline"
};
function StatusDot({ status, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$0_$40$babel$2b$core$40$7$2e$2_e488ea4877697f6c405c0ecc7443a2d8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-block size-2.5 shrink-0 rounded-full", colorByStatus[status], className),
        "aria-hidden": "true"
    }, void 0, false, {
        fileName: "[project]/components/status-dot.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
_c = StatusDot;
var _c;
__turbopack_context__.k.register(_c, "StatusDot");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/mock-data.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Frontend-only mock data for the Steam-style app.
// No real Steam API is used — everything here is illustrative sample data.
__turbopack_context__.s([
    "achievements",
    ()=>achievements,
    "currentUser",
    ()=>currentUser,
    "friends",
    ()=>friends,
    "games",
    ()=>games,
    "getFriend",
    ()=>getFriend,
    "getFriendName",
    ()=>getFriendName,
    "getGame",
    ()=>getGame,
    "news",
    ()=>news,
    "recentPlays",
    ()=>recentPlays,
    "statusLabel",
    ()=>statusLabel,
    "userFriendIds",
    ()=>userFriendIds
]);
const games = [
    {
        title: "Nebula Drift",
        image: "/games/nebula-drift.png",
        developer: "Lumen Interactive",
        appId: 730100
    },
    {
        title: "Ashen Kingdoms",
        image: "/games/ashen-kingdoms.png",
        developer: "Emberforge Studios",
        appId: 550220
    },
    {
        title: "Neon Circuit",
        image: "/games/neon-circuit.png",
        developer: "Pulse Games",
        appId: 442310
    },
    {
        title: "Verdant Hollow",
        image: "/games/verdant-hollow.png",
        developer: "Willow & Oak",
        appId: 903440
    },
    {
        title: "Iron Vanguard",
        image: "/games/iron-vanguard.png",
        developer: "Cobalt Line",
        appId: 128870
    },
    {
        title: "Shadowline",
        image: "/games/shadowline.png",
        developer: "Nightjar Collective",
        appId: 667012
    }
];
const currentUser = {
    id: "u0",
    name: "Vector",
    avatar: "/avatars/user.png",
    level: 47,
    status: "Online",
    memberSince: "March 2013",
    countryFlag: "🇺🇸",
    favoriteGameIds: [
        "nebula-drift",
        "ashen-kingdoms",
        "shadowline"
    ]
};
const friends = [
    {
        id: "f1",
        name: "PixelWitch",
        avatar: "/avatars/friend-1.png",
        status: "Online",
        level: 62,
        countryFlag: "🇨🇦",
        currentGameId: "ashen-kingdoms",
        mutualFriendIds: [
            "f2",
            "f3",
            "f7"
        ],
        totalPlaytime: 3120
    },
    {
        id: "f2",
        name: "GrizzlyDev",
        avatar: "/avatars/friend-2.png",
        status: "Online",
        level: 38,
        countryFlag: "🇬🇧",
        mutualFriendIds: [
            "f1",
            "f3",
            "f4"
        ],
        totalPlaytime: 1890
    },
    {
        id: "f3",
        name: "VisorKid",
        avatar: "/avatars/friend-3.png",
        status: "Online",
        level: 51,
        countryFlag: "🇩🇪",
        currentGameId: "neon-circuit",
        mutualFriendIds: [
            "f1",
            "f2",
            "f5",
            "f8"
        ],
        totalPlaytime: 2450
    },
    {
        id: "f4",
        name: "CrimsonJ",
        avatar: "/avatars/friend-4.png",
        status: "Offline",
        level: 29,
        countryFlag: "🇫🇷",
        mutualFriendIds: [
            "f2",
            "f6"
        ],
        totalPlaytime: 940
    },
    {
        id: "f5",
        name: "HelmBot",
        avatar: "/avatars/friend-5.png",
        status: "Online",
        level: 74,
        countryFlag: "🇯🇵",
        currentGameId: "iron-vanguard",
        mutualFriendIds: [
            "f3",
            "f8",
            "f9"
        ],
        totalPlaytime: 5210
    },
    {
        id: "f6",
        name: "OldGuard",
        avatar: "/avatars/friend-6.png",
        status: "Offline",
        level: 33,
        countryFlag: "🇸🇪",
        mutualFriendIds: [
            "f4",
            "f7"
        ],
        totalPlaytime: 1120
    },
    {
        id: "f7",
        name: "NyaBeats",
        avatar: "/avatars/friend-7.png",
        status: "Online",
        level: 45,
        countryFlag: "🇰🇷",
        mutualFriendIds: [
            "f1",
            "f6",
            "f9"
        ],
        totalPlaytime: 2010
    },
    {
        id: "f8",
        name: "VoltFace",
        avatar: "/avatars/friend-8.png",
        status: "Online",
        level: 56,
        countryFlag: "🇧🇷",
        currentGameId: "nebula-drift",
        mutualFriendIds: [
            "f3",
            "f5"
        ],
        totalPlaytime: 3380
    },
    {
        id: "f9",
        name: "BraidRunner",
        avatar: "/avatars/friend-9.png",
        status: "Online",
        level: 41,
        countryFlag: "🇦🇺",
        currentGameId: "verdant-hollow",
        mutualFriendIds: [
            "f5",
            "f7"
        ],
        totalPlaytime: 1670
    }
];
const userFriendIds = friends.map((f)=>f.id);
const recentPlays = [
    {
        friendId: "f1",
        gameId: "ashen-kingdoms",
        hoursTwoWeeks: 22.4,
        lastPlayed: "Playing now"
    },
    {
        friendId: "f3",
        gameId: "neon-circuit",
        hoursTwoWeeks: 14.1,
        lastPlayed: "Playing now"
    },
    {
        friendId: "f5",
        gameId: "iron-vanguard",
        hoursTwoWeeks: 31.7,
        lastPlayed: "Playing now"
    },
    {
        friendId: "f8",
        gameId: "nebula-drift",
        hoursTwoWeeks: 18.9,
        lastPlayed: "Playing now"
    },
    {
        friendId: "f9",
        gameId: "verdant-hollow",
        hoursTwoWeeks: 9.3,
        lastPlayed: "2 hours ago"
    },
    {
        friendId: "f2",
        gameId: "iron-vanguard",
        hoursTwoWeeks: 6.5,
        lastPlayed: "Yesterday"
    },
    {
        friendId: "f7",
        gameId: "nebula-drift",
        hoursTwoWeeks: 11.2,
        lastPlayed: "Yesterday"
    },
    {
        friendId: "f4",
        gameId: "shadowline",
        hoursTwoWeeks: 4.8,
        lastPlayed: "3 days ago"
    },
    {
        friendId: "f6",
        gameId: "ashen-kingdoms",
        hoursTwoWeeks: 7.6,
        lastPlayed: "4 days ago"
    },
    {
        friendId: "f1",
        gameId: "shadowline",
        hoursTwoWeeks: 3.2,
        lastPlayed: "5 days ago"
    }
];
const news = [
    {
        id: "n1",
        gameId: "ashen-kingdoms",
        title: "Ashen Kingdoms — The Emberfall Update is live",
        source: "Emberforge Studios",
        date: "Aug 14, 2026",
        snippet: "A new region opens beyond the Ashen Gate, bringing three boss encounters, a reworked parry system, and 40 new achievements to hunt."
    },
    {
        id: "n2",
        gameId: "nebula-drift",
        title: "Nebula Drift Season 4: Voidrunners begins",
        source: "Lumen Interactive",
        date: "Aug 13, 2026",
        snippet: "Season 4 introduces the co-op Deep Void raid, a new carrier-class ship, and cross-fleet leaderboards for the whole squadron."
    },
    {
        id: "n3",
        gameId: "neon-circuit",
        title: "Neon Circuit patch 2.7 rebalances drift scoring",
        source: "Pulse Games",
        date: "Aug 11, 2026",
        snippet: "Drift chains now reward consistency over risk, plus two night-city tracks and a photo mode land in this week’s update."
    },
    {
        id: "n4",
        gameId: "iron-vanguard",
        title: "Iron Vanguard competitive ladder resets for Act III",
        source: "Cobalt Line",
        date: "Aug 10, 2026",
        snippet: "Ranked resets across all regions as Act III adds the Foundry map, a new support mech, and anti-cheat improvements."
    },
    {
        id: "n5",
        gameId: "verdant-hollow",
        title: "Verdant Hollow: Autumn Harvest festival returns",
        source: "Willow & Oak",
        date: "Aug 8, 2026",
        snippet: "Decorate your homestead, trade rare seeds with neighbors, and unlock the limited Golden Scarecrow before the season ends."
    },
    {
        id: "n6",
        gameId: "shadowline",
        title: "Shadowline developer diary: designing silent takedowns",
        source: "Nightjar Collective",
        date: "Aug 6, 2026",
        snippet: "The team breaks down the new reactive AI, dynamic shadows, and how the upcoming heist DLC reshapes level design."
    },
    {
        id: "n7",
        gameId: "nebula-drift",
        title: "Community spotlight: the Nebula Drift photo contest winners",
        source: "Lumen Interactive",
        date: "Aug 4, 2026",
        snippet: "We rounded up the most breathtaking captures from across the galaxy. Check out the top ten shots from the community."
    }
];
const achievements = [
    {
        id: "a1",
        gameId: "ashen-kingdoms",
        name: "First Ember",
        description: "Light the first bonfire beyond the Ashen Gate.",
        globalPct: 78.4,
        friendsPct: 85,
        unlockedByUser: true,
        unlockedDate: "Jul 2, 2026"
    },
    {
        id: "a2",
        gameId: "ashen-kingdoms",
        name: "Parry Master",
        description: "Perfectly parry 100 attacks.",
        globalPct: 31.2,
        friendsPct: 44,
        unlockedByUser: true,
        unlockedDate: "Jul 19, 2026"
    },
    {
        id: "a3",
        gameId: "ashen-kingdoms",
        name: "The Long Dark",
        description: "Defeat the Warden of Ash without taking damage.",
        globalPct: 4.7,
        friendsPct: 11,
        unlockedByUser: false
    },
    {
        id: "a4",
        gameId: "ashen-kingdoms",
        name: "Ashbringer",
        description: "Reach the true ending.",
        globalPct: 12.9,
        friendsPct: 22,
        unlockedByUser: true,
        unlockedDate: "Aug 5, 2026"
    },
    {
        id: "a5",
        gameId: "ashen-kingdoms",
        name: "Completionist",
        description: "Collect every relic in the world.",
        globalPct: 2.1,
        friendsPct: 6,
        unlockedByUser: false
    },
    {
        id: "a6",
        gameId: "nebula-drift",
        name: "Maiden Voyage",
        description: "Complete the tutorial jump.",
        globalPct: 94.1,
        friendsPct: 100,
        unlockedByUser: true,
        unlockedDate: "Jun 1, 2026"
    },
    {
        id: "a7",
        gameId: "nebula-drift",
        name: "Ace Pilot",
        description: "Win 50 dogfights.",
        globalPct: 27.8,
        friendsPct: 38,
        unlockedByUser: true,
        unlockedDate: "Jun 24, 2026"
    },
    {
        id: "a8",
        gameId: "nebula-drift",
        name: "Deep Void",
        description: "Clear the Deep Void raid on legendary.",
        globalPct: 3.3,
        friendsPct: 9,
        unlockedByUser: false
    },
    {
        id: "a9",
        gameId: "nebula-drift",
        name: "Fleet Commander",
        description: "Lead a full squadron to victory.",
        globalPct: 15.6,
        friendsPct: 25,
        unlockedByUser: true,
        unlockedDate: "Jul 30, 2026"
    },
    {
        id: "a10",
        gameId: "shadowline",
        name: "Ghost",
        description: "Finish a mission fully undetected.",
        globalPct: 22.5,
        friendsPct: 30,
        unlockedByUser: true,
        unlockedDate: "Jul 12, 2026"
    },
    {
        id: "a11",
        gameId: "shadowline",
        name: "No Alarms",
        description: "Complete the heist without triggering a single alarm.",
        globalPct: 6.8,
        friendsPct: 14,
        unlockedByUser: false
    },
    {
        id: "a12",
        gameId: "shadowline",
        name: "Silent Legend",
        description: "Earn every stealth commendation.",
        globalPct: 1.9,
        friendsPct: 5,
        unlockedByUser: false
    }
];
function getGame(id) {
    return games.find((g)=>g.id === id);
}
function getFriend(id) {
    return friends.find((f)=>f.id === id);
}
function getFriendName(id) {
    return friends.find((f)=>f.id === id)?.name ?? "Unknown";
}
const statusLabel = {
    Online: "Online",
    Offline: "Offline",
    Away: "Away",
    "Looking to play": "Looking to play",
    "Looking to trade": "Looking to trade",
    Busy: "Busy",
    Snooze: "Snooze"
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$tailwind$2d$merge$40$3$2e$4$2e$0$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/tailwind-merge@3.4.0/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$tailwind$2d$merge$40$3$2e$4$2e$0$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_0ji4s53._.js.map