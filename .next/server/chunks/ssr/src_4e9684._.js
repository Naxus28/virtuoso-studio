module.exports = {

"[project]/src/lib/SessionRecorder.ts [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * SessionRecorder — stores MediaPipe landmark coordinates and posture quality per frame.
 * No video; only the math (landmarks + quality) for replay and stats.
 */ __turbopack_esm__({
    "SessionRecorder": (()=>SessionRecorder)
});
class SessionRecorder {
    frames = [];
    width = 640;
    height = 480;
    startedAt = 0;
    isRecording = false;
    start(width = 640, height = 480) {
        this.frames = [];
        this.width = width;
        this.height = height;
        this.startedAt = Date.now();
        this.isRecording = true;
    }
    stop() {
        this.isRecording = false;
        return this.getRecording();
    }
    addFrame(timestampMs, landmarks, quality) {
        if (!this.isRecording || landmarks.length === 0) return;
        this.frames.push({
            timestamp: timestampMs,
            landmarks: landmarks.map((lm)=>({
                    ...lm
                })),
            quality
        });
    }
    getRecording() {
        return {
            frames: [
                ...this.frames
            ],
            width: this.width,
            height: this.height,
            startedAt: this.startedAt,
            stoppedAt: Date.now()
        };
    }
    get history() {
        return [
            ...this.frames
        ];
    }
    get recording() {
        return this.isRecording;
    }
}
}}),
"[project]/src/lib/sessionLibrary.ts [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * Session Library — persist sessions to localStorage with name and view mode.
 */ __turbopack_esm__({
    "deleteSession": (()=>deleteSession),
    "getSessionById": (()=>getSessionById),
    "getStoredSessions": (()=>getStoredSessions),
    "saveSession": (()=>saveSession)
});
const STORAGE_KEY = "virtuoso-session-library";
function getStored() {
    if ("TURBOPACK compile-time truthy", 1) return [];
    "TURBOPACK unreachable";
}
function setStored(sessions) {
    if ("TURBOPACK compile-time truthy", 1) return;
    "TURBOPACK unreachable";
}
function getStoredSessions() {
    return getStored();
}
function saveSession(payload) {
    const session = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: payload.name.trim() || "Unnamed Session",
        viewMode: payload.viewMode,
        recording: payload.recording,
        savedAt: Date.now()
    };
    const sessions = getStored();
    sessions.unshift(session);
    setStored(sessions);
    return session;
}
function getSessionById(id) {
    return getStored().find((s)=>s.id === id) ?? null;
}
function deleteSession(id) {
    setStored(getStored().filter((s)=>s.id !== id));
}
}}),
"[project]/src/components/SessionStats.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "SessionStats": (()=>SessionStats)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$chart$2e$js$2f$dist$2f$chart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_import__("[project]/node_modules/chart.js/dist/chart.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$chartjs$2d$2$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/react-chartjs-2/dist/index.js [app-ssr] (ecmascript)");
"use client";
;
;
;
__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$chart$2e$js$2f$dist$2f$chart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Chart"].register(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$chart$2e$js$2f$dist$2f$chart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["CategoryScale"], __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$chart$2e$js$2f$dist$2f$chart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["LinearScale"], __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$chart$2e$js$2f$dist$2f$chart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["PointElement"], __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$chart$2e$js$2f$dist$2f$chart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["LineElement"], __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$chart$2e$js$2f$dist$2f$chart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Title"], __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$chart$2e$js$2f$dist$2f$chart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Tooltip"], __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$chart$2e$js$2f$dist$2f$chart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Filler"]);
const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        title: {
            display: true,
            text: "Posture Quality Over Time",
            color: "#e4e4e7",
            font: {
                size: 16
            }
        },
        legend: {
            display: false
        }
    },
    scales: {
        x: {
            grid: {
                color: "rgba(255,255,255,0.06)"
            },
            ticks: {
                color: "#a1a1aa",
                maxTicksLimit: 12
            },
            title: {
                display: true,
                text: "Time",
                color: "#a1a1aa"
            }
        },
        y: {
            min: 0,
            max: 1,
            grid: {
                color: "rgba(255,255,255,0.06)"
            },
            ticks: {
                color: "#a1a1aa"
            },
            title: {
                display: true,
                text: "Quality (1 = good)",
                color: "#a1a1aa"
            }
        }
    }
};
function SessionStats({ recording }) {
    if (!recording || recording.frames.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "w-full max-w-2xl h-64 rounded-xl bg-zinc-900/80 border border-zinc-700 flex items-center justify-center text-zinc-500 text-sm",
            children: "No session data. Start a session and stop it to see the graph."
        }, void 0, false, {
            fileName: "[project]/src/components/SessionStats.tsx",
            lineNumber: 61,
            columnNumber: 7
        }, this);
    }
    const labels = recording.frames.map((_, i)=>{
        const t = (recording.frames[i].timestamp - recording.frames[0].timestamp) / 1000;
        return `${t.toFixed(0)}s`;
    });
    const data = recording.frames.map((f)=>f.quality);
    const chartData = {
        labels,
        datasets: [
            {
                label: "Posture Quality",
                data,
                borderColor: "rgb(34, 197, 94)",
                backgroundColor: "rgba(34, 197, 94, 0.15)",
                fill: true,
                tension: 0.2,
                pointRadius: 0,
                pointHoverRadius: 4
            }
        ]
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-full max-w-2xl h-64 rounded-xl bg-zinc-900/80 border border-zinc-700 p-4",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$chartjs$2d$2$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Line"], {
            data: chartData,
            options: options
        }, void 0, false, {
            fileName: "[project]/src/components/SessionStats.tsx",
            lineNumber: 91,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/SessionStats.tsx",
        lineNumber: 90,
        columnNumber: 5
    }, this);
}
}}),
"[project]/src/components/PostureEngine.draw.ts [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "POSE_CONNECTIONS": (()=>POSE_CONNECTIONS),
    "drawSkeleton": (()=>drawSkeleton)
});
const POSE_CONNECTIONS = [
    [
        11,
        12
    ],
    [
        11,
        13
    ],
    [
        13,
        15
    ],
    [
        12,
        14
    ],
    [
        14,
        16
    ],
    [
        11,
        23
    ],
    [
        12,
        24
    ],
    [
        23,
        24
    ],
    [
        23,
        25
    ],
    [
        25,
        27
    ],
    [
        24,
        26
    ],
    [
        26,
        28
    ],
    [
        11,
        23
    ],
    [
        12,
        24
    ],
    [
        0,
        1
    ],
    [
        1,
        2
    ],
    [
        2,
        3
    ],
    [
        3,
        7
    ],
    [
        0,
        4
    ],
    [
        4,
        5
    ],
    [
        5,
        6
    ],
    [
        6,
        8
    ],
    [
        9,
        10
    ],
    [
        7,
        11
    ],
    [
        8,
        12
    ]
];
function drawSkeleton(ctx, landmarks, isSlouch, width, height) {
    const color = isSlouch ? "#ef4444" : "#22c55e";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    for (const [i, j] of POSE_CONNECTIONS){
        const a = landmarks[i];
        const b = landmarks[j];
        if (!a || !b || a.visibility !== undefined && a.visibility < 0.5 || b.visibility !== undefined && b.visibility < 0.5) continue;
        ctx.beginPath();
        ctx.moveTo(a.x * width, a.y * height);
        ctx.lineTo(b.x * width, b.y * height);
        ctx.stroke();
    }
    landmarks.forEach((lm)=>{
        if (lm.visibility !== undefined && lm.visibility < 0.5) return;
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 4, 0, 2 * Math.PI);
        ctx.fill();
    });
}
}}),
"[project]/src/components/PostureEngine.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "PostureEngine": (()=>PostureEngine),
    "SENSITIVITY_MAX_PCT": (()=>SENSITIVITY_MAX_PCT),
    "SENSITIVITY_MIN_PCT": (()=>SENSITIVITY_MIN_PCT)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$webcam$2f$dist$2f$react$2d$webcam$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/react-webcam/dist/react-webcam.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$SessionRecorder$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/lib/SessionRecorder.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$sessionLibrary$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/lib/sessionLibrary.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SessionStats$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/components/SessionStats.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$PostureEngine$2e$draw$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/components/PostureEngine.draw.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_import__("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-ssr] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$camera$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Camera$3e$__ = __turbopack_import__("[project]/node_modules/lucide-react/dist/esm/icons/camera.js [app-ssr] (ecmascript) <export default as Camera>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__ = __turbopack_import__("[project]/node_modules/lucide-react/dist/esm/icons/activity.js [app-ssr] (ecmascript) <export default as Activity>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$play$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Play$3e$__ = __turbopack_import__("[project]/node_modules/lucide-react/dist/esm/icons/play.js [app-ssr] (ecmascript) <export default as Play>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Square$3e$__ = __turbopack_import__("[project]/node_modules/lucide-react/dist/esm/icons/square.js [app-ssr] (ecmascript) <export default as Square>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_import__("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-ssr] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__ = __turbopack_import__("[project]/node_modules/lucide-react/dist/esm/icons/rotate-ccw.js [app-ssr] (ecmascript) <export default as RotateCcw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__ = __turbopack_import__("[project]/node_modules/lucide-react/dist/esm/icons/chart-column.js [app-ssr] (ecmascript) <export default as BarChart3>");
"use client";
;
;
;
;
;
;
;
;
;
// MediaPipe Pose landmark indices
const EAR_LEFT = 7;
const EAR_RIGHT = 8;
const SHOULDER_LEFT = 11;
const SHOULDER_RIGHT = 12;
const HIP_LEFT = 23;
const HIP_RIGHT = 24;
const SMOOTHING_ALPHA = 0.3;
/** Only alert after bad posture persists this long (ms) — 0.5s for rapid response */ const PERSISTENCE_MS = 500;
/** ~30fps → frames needed for persistence */ const PERSISTENCE_FRAMES = Math.max(1, Math.round(PERSISTENCE_MS / 1000 * 30));
/** Lean: angle (ear-shoulder-hip) below baseline * this = head forward */ const LEAN_ANGLE_RATIO = 0.88;
/** Tension: shoulders elevated vs baseline (world Y). Lower = more sensitive to subtle tension. */ const TENSION_SHOULDER_UP_WORLD_M = 0.005; // ~5mm elevation triggers (catch before you feel it)
/** Only treat as shrug (don’t alert) when shoulder rises this much with ear stable — so small elevation still = tension */ const SHRUG_TOLERANCE_WORLD = 0.025; // ~25mm one-sided rise with ear stable = shrug
/** Quality below this = show alert in playback/chart (0–1) */ const QUALITY_ALERT_THRESHOLD = 0.88;
/** Front view: max shoulder height difference (world Y, meters) for symmetry */ const FRONT_SHOULDER_SYMMETRY_TOLERANCE_M = 0.03;
const TENSION_HUM_HZ = 200;
const TENSION_HUM_GAIN_MIN = 0.05;
const TENSION_HUM_GAIN_MAX = 0.3;
function lowPass(prev, next, alpha) {
    if (!prev) return {
        ...next
    };
    return {
        x: alpha * next.x + (1 - alpha) * prev.x,
        y: alpha * next.y + (1 - alpha) * prev.y,
        z: next.z,
        visibility: next.visibility
    };
}
function lowPassWorld(prev, next, alpha) {
    if (!prev) return {
        ...next
    };
    return {
        x: alpha * next.x + (1 - alpha) * prev.x,
        y: alpha * next.y + (1 - alpha) * prev.y,
        z: alpha * next.z + (1 - alpha) * prev.z
    };
}
/** 3D distance in meters (world coordinates). */ function dist3(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
/** Angle in degrees at shoulder between vectors shoulder→ear and shoulder→hip (3D). Smaller = head forward (lean). */ function angleEarShoulderHipWorld(ear, shoulder, hip) {
    const vx = ear.x - shoulder.x;
    const vy = ear.y - shoulder.y;
    const vz = ear.z - shoulder.z;
    const wx = hip.x - shoulder.x;
    const wy = hip.y - shoulder.y;
    const wz = hip.z - shoulder.z;
    const dot = vx * wx + vy * wy + vz * wz;
    const magV = Math.hypot(vx, vy, vz) || 1e-6;
    const magW = Math.hypot(wx, wy, wz) || 1e-6;
    const cos = Math.max(-1, Math.min(1, dot / (magV * magW)));
    return Math.acos(cos) * 180 / Math.PI;
}
const SENSITIVITY_MIN_PCT = 1;
const SENSITIVITY_MAX_PCT = 25;
/** Sensitivity 0–100 → ratio threshold (trigger when ear-shoulder shrinks below this). 0 = 1%, 100 = 25%. */ function sensitivityToRatioThreshold(sensitivityPercent) {
    const pct = Math.max(0, Math.min(100, sensitivityPercent));
    return 0.99 - pct / 100 * 0.24; // 1% shrink → 0.99, 25% shrink → 0.75
}
/** Front view: angle + shoulder symmetry + vertical compression (world coords). */ function evaluatePostureFront(w, baseline, sensitivityPercent) {
    if (w.length < 25) return {
        leanRaw: false,
        tensionRaw: false,
        isShrug: false,
        quality: 1
    };
    const angleL = angleEarShoulderHipWorld(w[EAR_LEFT], w[SHOULDER_LEFT], w[HIP_LEFT]);
    const angleR = angleEarShoulderHipWorld(w[EAR_RIGHT], w[SHOULDER_RIGHT], w[HIP_RIGHT]);
    const avgAngle = (angleL + angleR) / 2;
    const baselineAngle = (baseline.angleLeft + baseline.angleRight) / 2;
    const leanRaw = avgAngle < baselineAngle * LEAN_ANGLE_RATIO;
    const earYLeft = w[EAR_LEFT].y;
    const earYRight = w[EAR_RIGHT].y;
    const shoulderYLeft = w[SHOULDER_LEFT].y;
    const shoulderYRight = w[SHOULDER_RIGHT].y;
    const shoulderUpLeft = baseline.shoulderYLeft - shoulderYLeft > SHRUG_TOLERANCE_WORLD;
    const shoulderUpRight = baseline.shoulderYRight - shoulderYRight > SHRUG_TOLERANCE_WORLD;
    const earStableLeft = earYLeft <= baseline.earYLeft + SHRUG_TOLERANCE_WORLD;
    const earStableRight = earYRight <= baseline.earYRight + SHRUG_TOLERANCE_WORLD;
    const isShrug = shoulderUpLeft && earStableLeft || shoulderUpRight && earStableRight;
    const avgShoulderY = (shoulderYLeft + shoulderYRight) / 2;
    const baselineShoulderY = (baseline.shoulderYLeft + baseline.shoulderYRight) / 2;
    const avgEarY = (earYLeft + earYRight) / 2;
    const baselineEarY = (baseline.earYLeft + baseline.earYRight) / 2;
    const shouldersHigh = baselineShoulderY - avgShoulderY > TENSION_SHOULDER_UP_WORLD_M;
    const earNotDropped = avgEarY <= baselineEarY + SHRUG_TOLERANCE_WORLD;
    const shoulderSymmetry = Math.abs(shoulderYLeft - shoulderYRight) <= FRONT_SHOULDER_SYMMETRY_TOLERANCE_M;
    const tensionFromElevation = shouldersHigh && earNotDropped && !leanRaw && shoulderSymmetry;
    const vertLeft = Math.abs(w[EAR_LEFT].y - w[SHOULDER_LEFT].y);
    const vertRight = Math.abs(w[EAR_RIGHT].y - w[SHOULDER_RIGHT].y);
    const avgVert = (vertLeft + vertRight) / 2;
    const baselineVert = (baseline.earShoulderVertLeft + baseline.earShoulderVertRight) / 2;
    const vertRatio = baselineVert > 1e-6 ? avgVert / baselineVert : 1;
    const ratioThreshold = sensitivityToRatioThreshold(sensitivityPercent);
    const tensionFromVertical = vertRatio < ratioThreshold && !isShrug;
    const tensionRaw = tensionFromElevation || tensionFromVertical;
    const quality = Math.min(1, avgAngle / baselineAngle);
    return {
        leanRaw,
        tensionRaw,
        isShrug,
        quality
    };
}
/** Side view: ear–shoulder distance (7 to 11, 8 to 12) in world; alert when collapse. */ function evaluatePostureSide(w, baseline, ratioThreshold) {
    if (w.length < 25) return {
        leanRaw: false,
        tensionRaw: false,
        isShrug: false,
        quality: 1
    };
    const distLeft = dist3(w[EAR_LEFT], w[SHOULDER_LEFT]);
    const distRight = dist3(w[EAR_RIGHT], w[SHOULDER_RIGHT]);
    const avgDist = (distLeft + distRight) / 2;
    const baselineDist = (baseline.distLeft + baseline.distRight) / 2;
    const ratio = baselineDist > 1e-6 ? avgDist / baselineDist : 1;
    const leanRaw = ratio < ratioThreshold;
    const quality = Math.min(1, ratio);
    return {
        leanRaw,
        tensionRaw: false,
        isShrug: false,
        quality
    };
}
function PostureEngine({ replayId } = {}) {
    const webcamRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const poseRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const animationRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const playbackRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const videoTimestampRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const smoothedLandmarksRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])([]);
    const smoothedWorldLandmarksRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])([]);
    const sessionRecorderRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$SessionRecorder$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SessionRecorder"]());
    const isRecordingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const qualityRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(1);
    const videoSizeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])({
        width: 640,
        height: 480
    });
    const audioContextRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const gainNodeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const playbackStartTimeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const [viewMode, setViewMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("front");
    const [sensitivity, setSensitivity] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(35); // 0–100; 35 ≈ 12% shrink (default)
    const [isCalibrated, setIsCalibrated] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [baseline, setBaseline] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [sideViewBaseline, setSideViewBaseline] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [alertType, setAlertType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [landmarks, setLandmarks] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isPoseReady, setIsPoseReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isRecording, setIsRecording] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [sessionRecording, setSessionRecording] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isPlayback, setIsPlayback] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [playbackLandmarks, setPlaybackLandmarks] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [playbackSlouch, setPlaybackSlouch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    /** When replaying from library, show session name and view mode in the overlay */ const [replaySessionInfo, setReplaySessionInfo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const baselineRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const sideViewBaselineRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const isCalibratedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const viewModeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])("front");
    const sensitivityRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(35);
    const leanFramesRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const tensionFramesRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        baselineRef.current = baseline;
        sideViewBaselineRef.current = sideViewBaseline;
        isCalibratedRef.current = isCalibrated;
        viewModeRef.current = viewMode;
        sensitivityRef.current = sensitivity;
    }, [
        baseline,
        sideViewBaseline,
        isCalibrated,
        viewMode,
        sensitivity
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        isRecordingRef.current = isRecording;
    }, [
        isRecording
    ]);
    // Load session from library when replayId is provided (e.g. from /studio?replay=id)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        "TURBOPACK unreachable";
        const session = undefined;
    }, [
        replayId
    ]);
    // MediaPipe/TFLite stderr -> console.log
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const originalError = console.error;
        console.error = (...args)=>{
            const msg = args[0]?.toString?.() ?? "";
            if (msg.includes("INFO:") || msg.includes("TensorFlow Lite") || msg.includes("XNNPACK")) {
                console.log("[MediaPipe]", ...args);
                return;
            }
            originalError.apply(console, args);
        };
        return ()=>{
            console.error = originalError;
        };
    }, []);
    // Tension Hum: 200Hz sine, volume scales with slouch severity
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        "TURBOPACK unreachable";
        const ctx = undefined;
        const osc = undefined;
        const gain = undefined;
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const gain = gainNodeRef.current;
        const ctx = audioContextRef.current;
        if (!gain || !ctx) return;
        const isAlert = alertType != null;
        if (isAlert) {
            const q = qualityRef.current;
            const severity = 1 - Math.max(0, q);
            gain.gain.setTargetAtTime(TENSION_HUM_GAIN_MIN + severity * (TENSION_HUM_GAIN_MAX - TENSION_HUM_GAIN_MIN), ctx.currentTime, 0.05);
            if (ctx.state === "suspended") ctx.resume();
        } else {
            gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        }
    }, [
        alertType
    ]);
    // Initialize MediaPipe Pose
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let cancelled = false;
        (async ()=>{
            try {
                const { FilesetResolver, PoseLandmarker } = await __turbopack_require__("[project]/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs [app-ssr] (ecmascript, async loader)")(__turbopack_import__);
                const wasm = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
                const pose = await PoseLandmarker.createFromOptions(wasm, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
                    },
                    runningMode: "VIDEO",
                    numPoses: 1,
                    minPoseDetectionConfidence: 0.5,
                    minPosePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                if (cancelled) {
                    pose.close();
                    return;
                }
                poseRef.current = pose;
                setIsPoseReady(true);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load Pose");
            }
        })();
        return ()=>{
            cancelled = true;
            const p = poseRef.current;
            poseRef.current = null;
            p?.close();
        };
    }, []);
    const handleCalibrate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        const world = smoothedWorldLandmarksRef.current;
        if (world.length < 25) return;
        const mode = viewModeRef.current;
        if (mode === "front") {
            const angleLeft = angleEarShoulderHipWorld(world[EAR_LEFT], world[SHOULDER_LEFT], world[HIP_LEFT]);
            const angleRight = angleEarShoulderHipWorld(world[EAR_RIGHT], world[SHOULDER_RIGHT], world[HIP_RIGHT]);
            const bl = {
                angleLeft,
                angleRight,
                earYLeft: world[EAR_LEFT].y,
                earYRight: world[EAR_RIGHT].y,
                shoulderYLeft: world[SHOULDER_LEFT].y,
                shoulderYRight: world[SHOULDER_RIGHT].y,
                earShoulderVertLeft: Math.abs(world[EAR_LEFT].y - world[SHOULDER_LEFT].y),
                earShoulderVertRight: Math.abs(world[EAR_RIGHT].y - world[SHOULDER_RIGHT].y)
            };
            setBaseline(bl);
            setSideViewBaseline(null);
        } else {
            const distLeft = dist3(world[EAR_LEFT], world[SHOULDER_LEFT]);
            const distRight = dist3(world[EAR_RIGHT], world[SHOULDER_RIGHT]);
            setSideViewBaseline({
                distLeft,
                distRight
            });
            setBaseline(null);
        }
        setIsCalibrated(true);
        setAlertType(null);
        leanFramesRef.current = 0;
        tensionFramesRef.current = 0;
    }, []);
    const handleToggleViewMode = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setViewMode((prev)=>prev === "front" ? "side" : "front");
        setBaseline(null);
        setSideViewBaseline(null);
        setIsCalibrated(false);
        setAlertType(null);
        leanFramesRef.current = 0;
        tensionFramesRef.current = 0;
    }, []);
    const handleStartSession = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        const w = videoSizeRef.current.width;
        const h = videoSizeRef.current.height;
        sessionRecorderRef.current.start(w, h);
        setIsRecording(true);
        setSessionRecording(null);
        setIsPlayback(false);
        audioContextRef.current?.resume();
    }, []);
    const handleStopSession = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        const rec = sessionRecorderRef.current.stop();
        setIsRecording(false);
        setSessionRecording(rec);
        setIsPlayback(false);
        const name = ("TURBOPACK compile-time falsy", 0) ? ("TURBOPACK unreachable", undefined) : "";
        if ("TURBOPACK compile-time falsy", 0) {
            "TURBOPACK unreachable";
        }
    }, []);
    const handleReviewSession = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        if (!sessionRecording || sessionRecording.frames.length === 0) return;
        setIsPlayback(true);
        playbackStartTimeRef.current = performance.now();
    }, [
        sessionRecording
    ]);
    const handleBackToLive = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setIsPlayback(false);
    }, []);
    const handleStartNewSession = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setSessionRecording(null);
        setIsPlayback(false);
        setReplaySessionInfo(null);
    }, []);
    const handleDiscardAndRestart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        sessionRecorderRef.current.stop();
        setSessionRecording(null);
        setIsRecording(false);
        setIsPlayback(false);
    }, []);
    // Process video frames (only when not in playback)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isPlayback) return;
        const pose = poseRef.current;
        const webcam = webcamRef.current?.video;
        if (!pose || !webcam || !isPoseReady) return;
        function tick() {
            const p = poseRef.current;
            if (webcam && webcam.readyState === 4 && p && webcam.videoWidth > 0 && webcam.videoHeight > 0) {
                videoSizeRef.current = {
                    width: webcam.videoWidth,
                    height: webcam.videoHeight
                };
                try {
                    videoTimestampRef.current += 1;
                    const result = p.detectForVideo(webcam, videoTimestampRef.current);
                    const raw = result?.landmarks?.[0] ?? [];
                    const rawWorld = result?.worldLandmarks?.[0] ?? [];
                    if (raw.length === 0) {
                        setLandmarks([]);
                        leanFramesRef.current = 0;
                        tensionFramesRef.current = 0;
                        setAlertType(null);
                    } else {
                        const smoothed = raw.map((lm, i)=>lowPass(smoothedLandmarksRef.current[i], {
                                x: lm.x,
                                y: lm.y,
                                z: lm.z,
                                visibility: undefined
                            }, SMOOTHING_ALPHA));
                        smoothedLandmarksRef.current = smoothed;
                        setLandmarks(smoothed);
                        const worldSmoothed = rawWorld.map((lm, i)=>lowPassWorld(smoothedWorldLandmarksRef.current[i], {
                                x: lm.x,
                                y: lm.y,
                                z: lm.z
                            }, SMOOTHING_ALPHA));
                        smoothedWorldLandmarksRef.current = worldSmoothed;
                        const mode = viewModeRef.current;
                        const base = baselineRef.current;
                        const sideBase = sideViewBaselineRef.current;
                        let quality = 1;
                        if (isCalibratedRef.current && mode === "front" && base != null) {
                            const { leanRaw, tensionRaw, isShrug, quality: q } = evaluatePostureFront(worldSmoothed, base, sensitivityRef.current);
                            quality = q;
                            qualityRef.current = quality;
                            const leanCounts = leanRaw && !isShrug;
                            const tensionCounts = tensionRaw;
                            if (leanCounts) {
                                leanFramesRef.current += 1;
                                tensionFramesRef.current = 0;
                            } else if (tensionCounts) {
                                tensionFramesRef.current += 1;
                                leanFramesRef.current = 0;
                            } else {
                                leanFramesRef.current = 0;
                                tensionFramesRef.current = 0;
                            }
                            const leanPersisted = leanFramesRef.current >= PERSISTENCE_FRAMES;
                            const tensionPersisted = tensionFramesRef.current >= PERSISTENCE_FRAMES;
                            setAlertType((prev)=>{
                                if (leanPersisted) return "lean";
                                if (tensionPersisted) return "tension";
                                return null;
                            });
                        } else if (isCalibratedRef.current && mode === "side" && sideBase != null) {
                            const ratioThreshold = sensitivityToRatioThreshold(sensitivityRef.current);
                            const { leanRaw, quality: q } = evaluatePostureSide(worldSmoothed, sideBase, ratioThreshold);
                            quality = q;
                            qualityRef.current = quality;
                            if (leanRaw) {
                                leanFramesRef.current += 1;
                                tensionFramesRef.current = 0;
                            } else {
                                leanFramesRef.current = 0;
                                tensionFramesRef.current = 0;
                            }
                            const leanPersisted = leanFramesRef.current >= PERSISTENCE_FRAMES;
                            setAlertType(leanPersisted ? "lean" : null);
                        } else {
                            qualityRef.current = 1;
                            leanFramesRef.current = 0;
                            tensionFramesRef.current = 0;
                            setAlertType(null);
                        }
                        if (isRecordingRef.current) {
                            sessionRecorderRef.current.addFrame(Date.now(), smoothed, quality);
                        }
                    }
                } catch  {
                // ignore
                }
            }
            animationRef.current = requestAnimationFrame(tick);
        }
        animationRef.current = requestAnimationFrame(tick);
        return ()=>cancelAnimationFrame(animationRef.current);
    }, [
        isPoseReady,
        isPlayback
    ]);
    // Playback loop: advance frame index and set playbackLandmarks/playbackSlouch
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!isPlayback || !sessionRecording || sessionRecording.frames.length === 0) return;
        const frames = sessionRecording.frames;
        const fps = 30;
        const frameMs = 1000 / fps;
        function tick() {
            const elapsed = performance.now() - playbackStartTimeRef.current;
            const frameIndex = Math.floor(elapsed / frameMs) % frames.length;
            const frame = frames[frameIndex];
            if (frame) {
                setPlaybackLandmarks(frame.landmarks);
                setPlaybackSlouch(frame.quality < QUALITY_ALERT_THRESHOLD);
            }
            playbackRef.current = requestAnimationFrame(tick);
        }
        playbackRef.current = requestAnimationFrame(tick);
        return ()=>cancelAnimationFrame(playbackRef.current);
    }, [
        isPlayback,
        sessionRecording
    ]);
    // Draw skeleton: live or playback
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        if (isPlayback && sessionRecording) {
            const w = sessionRecording.width;
            const h = sessionRecording.height;
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
            ctx.clearRect(0, 0, w, h);
            if (playbackLandmarks.length > 0) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$PostureEngine$2e$draw$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["drawSkeleton"])(ctx, playbackLandmarks, playbackSlouch, w, h);
            }
            return;
        }
        const video = webcamRef.current?.video;
        if (!video || landmarks.length === 0) return;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        ctx.clearRect(0, 0, w, h);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$PostureEngine$2e$draw$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["drawSkeleton"])(ctx, landmarks, alertType != null, w, h);
    }, [
        landmarks,
        alertType,
        isPlayback,
        sessionRecording,
        playbackLandmarks,
        playbackSlouch
    ]);
    const videoConstraints = {
        width: {
            ideal: 640
        },
        height: {
            ideal: 480
        },
        facingMode: "user"
    };
    const showLiveView = !isPlayback;
    const hasRecording = sessionRecording && sessionRecording.frames.length > 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col items-center gap-4",
        children: [
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-red-400 text-sm",
                role: "alert",
                children: error
            }, void 0, false, {
                fileName: "[project]/src/components/PostureEngine.tsx",
                lineNumber: 655,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative inline-block rounded-xl overflow-hidden bg-zinc-900 shadow-xl w-full max-w-[640px]",
                children: [
                    showLiveView ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$webcam$2f$dist$2f$react$2d$webcam$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                ref: webcamRef,
                                audio: false,
                                videoConstraints: videoConstraints,
                                className: "block w-full mirror",
                                mirrored: true
                            }, void 0, false, {
                                fileName: "[project]/src/components/PostureEngine.tsx",
                                lineNumber: 663,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
                                ref: canvasRef,
                                className: "absolute inset-0 w-full h-full pointer-events-none",
                                style: {
                                    transform: "scaleX(-1)"
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/PostureEngine.tsx",
                                lineNumber: 670,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-full aspect-video bg-zinc-900 flex items-center justify-center",
                        style: {
                            aspectRatio: `${sessionRecording?.width ?? 640} / ${sessionRecording?.height ?? 480}`
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
                            ref: canvasRef,
                            className: "w-full h-full object-contain",
                            style: {
                                transform: "scaleX(-1)"
                            }
                        }, void 0, false, {
                            fileName: "[project]/src/components/PostureEngine.tsx",
                            lineNumber: 681,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/PostureEngine.tsx",
                        lineNumber: 677,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute bottom-2 left-2 right-2 text-center text-xs text-white/80 bg-black/50 rounded px-2 py-1",
                        children: "Educational Tool Only — Not a medical device."
                    }, void 0, false, {
                        fileName: "[project]/src/components/PostureEngine.tsx",
                        lineNumber: 689,
                        columnNumber: 9
                    }, this),
                    isPlayback && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute top-2 left-2 right-2 text-center text-xs text-amber-200/90 bg-black/50 rounded px-2 py-1",
                        children: replaySessionInfo ? `Reviewing: ${replaySessionInfo.name} · ${replaySessionInfo.viewMode === "front" ? "Front" : "Side"} View` : "Reviewing session — replay"
                    }, void 0, false, {
                        fileName: "[project]/src/components/PostureEngine.tsx",
                        lineNumber: 693,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                        children: (showLiveView ? alertType : playbackSlouch) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                            initial: {
                                opacity: 0,
                                y: 4
                            },
                            animate: {
                                opacity: 1,
                                y: 0
                            },
                            exit: {
                                opacity: 0,
                                y: 4
                            },
                            className: "absolute top-10 left-2 right-2 flex items-center justify-center gap-2 rounded-lg bg-red-500/90 text-white px-3 py-2 text-sm font-medium",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                    className: "shrink-0",
                                    size: 18
                                }, void 0, false, {
                                    fileName: "[project]/src/components/PostureEngine.tsx",
                                    lineNumber: 707,
                                    columnNumber: 15
                                }, this),
                                showLiveView && alertType === "tension" ? "Tension Detected" : showLiveView && alertType === "lean" ? "Lean Detected" : "Tension Alert"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/PostureEngine.tsx",
                            lineNumber: 701,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/PostureEngine.tsx",
                        lineNumber: 699,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/PostureEngine.tsx",
                lineNumber: 660,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-full max-w-[640px] space-y-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap items-center justify-center gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 border border-zinc-600",
                            "aria-live": "polite",
                            children: [
                                "View: ",
                                viewMode === "front" ? "Front" : "Side"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/PostureEngine.tsx",
                            lineNumber: 720,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: handleToggleViewMode,
                            disabled: isRecording,
                            className: "inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-500 disabled:opacity-50 disabled:pointer-events-none",
                            title: viewMode === "front" ? "Side view focuses on ear–shoulder distance" : "Front view uses angle + shoulder symmetry",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$camera$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Camera$3e$__["Camera"], {
                                    size: 18
                                }, void 0, false, {
                                    fileName: "[project]/src/components/PostureEngine.tsx",
                                    lineNumber: 733,
                                    columnNumber: 13
                                }, this),
                                viewMode === "front" ? "Switch to Side View" : "Switch to Front View"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/PostureEngine.tsx",
                            lineNumber: 726,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: handleCalibrate,
                            disabled: !isPoseReady || landmarks.length === 0 || isRecording,
                            className: "inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"], {
                                    size: 18
                                }, void 0, false, {
                                    fileName: "[project]/src/components/PostureEngine.tsx",
                                    lineNumber: 742,
                                    columnNumber: 13
                                }, this),
                                "Calibrate"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/PostureEngine.tsx",
                            lineNumber: 736,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "w-full flex flex-col gap-1 basis-full",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    htmlFor: "sensitivity",
                                    className: "text-sm text-zinc-400 flex justify-between",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Sensitivity"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/PostureEngine.tsx",
                                            lineNumber: 748,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                Math.round(SENSITIVITY_MIN_PCT + sensitivity / 100 * (SENSITIVITY_MAX_PCT - SENSITIVITY_MIN_PCT)),
                                                "% shrink"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/PostureEngine.tsx",
                                            lineNumber: 749,
                                            columnNumber: 13
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/PostureEngine.tsx",
                                    lineNumber: 747,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    id: "sensitivity",
                                    type: "range",
                                    min: 0,
                                    max: 100,
                                    value: sensitivity,
                                    onChange: (e)=>setSensitivity(Number(e.target.value)),
                                    className: "w-full h-2 rounded-lg appearance-none bg-zinc-700 accent-emerald-500",
                                    "aria-label": "Sensitivity: 5% very strict to 25% very loose"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/PostureEngine.tsx",
                                    lineNumber: 753,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-between text-xs text-zinc-500",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Very Strict (5%)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/PostureEngine.tsx",
                                            lineNumber: 764,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Very Loose (25%)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/PostureEngine.tsx",
                                            lineNumber: 765,
                                            columnNumber: 13
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/PostureEngine.tsx",
                                    lineNumber: 763,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/PostureEngine.tsx",
                            lineNumber: 746,
                            columnNumber: 9
                        }, this),
                        !isRecording && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: handleStartSession,
                            disabled: !isPoseReady || !isCalibrated,
                            className: "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$play$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Play$3e$__["Play"], {
                                    size: 18
                                }, void 0, false, {
                                    fileName: "[project]/src/components/PostureEngine.tsx",
                                    lineNumber: 776,
                                    columnNumber: 13
                                }, this),
                                sessionRecording ? "Continue Session" : "Start Session"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/PostureEngine.tsx",
                            lineNumber: 770,
                            columnNumber: 11
                        }, this),
                        isRecording && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: handleStopSession,
                                    className: "inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Square$3e$__["Square"], {
                                            size: 18
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/PostureEngine.tsx",
                                            lineNumber: 787,
                                            columnNumber: 15
                                        }, this),
                                        "Stop Session"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/PostureEngine.tsx",
                                    lineNumber: 782,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: handleDiscardAndRestart,
                                    className: "inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-500",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                            size: 18
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/PostureEngine.tsx",
                                            lineNumber: 795,
                                            columnNumber: 15
                                        }, this),
                                        "Discard & Restart"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/PostureEngine.tsx",
                                    lineNumber: 790,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true),
                        hasRecording && !isPlayback && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: handleReviewSession,
                            className: "inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__["RotateCcw"], {
                                    size: 18
                                }, void 0, false, {
                                    fileName: "[project]/src/components/PostureEngine.tsx",
                                    lineNumber: 806,
                                    columnNumber: 13
                                }, this),
                                "Review Session"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/PostureEngine.tsx",
                            lineNumber: 801,
                            columnNumber: 11
                        }, this),
                        isPlayback && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: handleBackToLive,
                                    className: "inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-500",
                                    children: "Back to Live"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/PostureEngine.tsx",
                                    lineNumber: 812,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: handleStartNewSession,
                                    className: "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$play$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Play$3e$__["Play"], {
                                            size: 18
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/PostureEngine.tsx",
                                            lineNumber: 824,
                                            columnNumber: 15
                                        }, this),
                                        "Start New Session"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/PostureEngine.tsx",
                                    lineNumber: 819,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true),
                        isCalibrated && showLiveView && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-zinc-400 text-sm",
                            children: viewMode === "side" ? alertType === "lean" ? "Lean detected" : "Good posture" : alertType === "tension" ? "Tension detected" : alertType === "lean" ? "Lean detected" : "Good posture"
                        }, void 0, false, {
                            fileName: "[project]/src/components/PostureEngine.tsx",
                            lineNumber: 831,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/PostureEngine.tsx",
                    lineNumber: 719,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/PostureEngine.tsx",
                lineNumber: 718,
                columnNumber: 7
            }, this),
            sessionRecording && !isPlayback && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-full flex flex-col items-center gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-sm font-medium text-zinc-300 flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"], {
                                size: 18
                            }, void 0, false, {
                                fileName: "[project]/src/components/PostureEngine.tsx",
                                lineNumber: 849,
                                columnNumber: 13
                            }, this),
                            "Session Stats"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/PostureEngine.tsx",
                        lineNumber: 848,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SessionStats$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SessionStats"], {
                        recording: sessionRecording
                    }, void 0, false, {
                        fileName: "[project]/src/components/PostureEngine.tsx",
                        lineNumber: 852,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/PostureEngine.tsx",
                lineNumber: 847,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/PostureEngine.tsx",
        lineNumber: 653,
        columnNumber: 5
    }, this);
}
}}),
"[project]/src/app/studio/page.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "default": (()=>StudioPage)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$PostureEngine$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/components/PostureEngine.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_import__("[project]/node_modules/lucide-react/dist/esm/icons/arrow-left.js [app-ssr] (ecmascript) <export default as ArrowLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$folder$2d$open$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FolderOpen$3e$__ = __turbopack_import__("[project]/node_modules/lucide-react/dist/esm/icons/folder-open.js [app-ssr] (ecmascript) <export default as FolderOpen>");
"use client";
;
;
;
;
;
;
function StudioContent() {
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const replayId = searchParams.get("replay");
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute top-4 left-4 right-4 flex justify-between items-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: "inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition-colors",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                                size: 18
                            }, void 0, false, {
                                fileName: "[project]/src/app/studio/page.tsx",
                                lineNumber: 20,
                                columnNumber: 11
                            }, this),
                            "Back to home"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/studio/page.tsx",
                        lineNumber: 16,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: "/library",
                        className: "inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition-colors",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$folder$2d$open$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FolderOpen$3e$__["FolderOpen"], {
                                size: 18
                            }, void 0, false, {
                                fileName: "[project]/src/app/studio/page.tsx",
                                lineNumber: 27,
                                columnNumber: 11
                            }, this),
                            "Session Library"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/studio/page.tsx",
                        lineNumber: 23,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/studio/page.tsx",
                lineNumber: 15,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                className: "text-2xl font-semibold text-zinc-100 mb-2",
                children: "Virtuoso Studio"
            }, void 0, false, {
                fileName: "[project]/src/app/studio/page.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-zinc-400 text-sm mb-6",
                children: "Zero-Cost Prototype — Posture feedback"
            }, void 0, false, {
                fileName: "[project]/src/app/studio/page.tsx",
                lineNumber: 34,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$PostureEngine$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PostureEngine"], {
                replayId: replayId
            }, void 0, false, {
                fileName: "[project]/src/app/studio/page.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
function StudioPage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "min-h-screen flex flex-col items-center justify-center p-4",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Suspense"], {
            fallback: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-zinc-400",
                children: "Loading…"
            }, void 0, false, {
                fileName: "[project]/src/app/studio/page.tsx",
                lineNumber: 45,
                columnNumber: 27
            }, void 0),
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(StudioContent, {}, void 0, false, {
                fileName: "[project]/src/app/studio/page.tsx",
                lineNumber: 46,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/studio/page.tsx",
            lineNumber: 45,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/studio/page.tsx",
        lineNumber: 44,
        columnNumber: 5
    }, this);
}
}}),
"[project]/src/app/studio/page.tsx [app-rsc] (ecmascript, Next.js server component, client modules ssr)": ((__turbopack_context__) => {

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, t: __turbopack_require_real__ } = __turbopack_context__;
{
}}),

};

//# sourceMappingURL=src_4e9684._.js.map