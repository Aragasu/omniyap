/* OmniYap site — OS detection, latest GitHub release downloads and the plugin catalogue. */
const REPO = "Aragasu/omniyap";
const RELEASES = `https://github.com/${REPO}/releases`;
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function detectOS() {
    const ua = navigator.userAgent || "";
    const platform = (navigator.userAgentData?.platform || navigator.platform || "").toLowerCase();
    let key = "unknown";
    if (/win/i.test(platform) || /windows/i.test(ua)) key = "windows";
    else if (/mac/i.test(platform) || /mac os x|macintosh/i.test(ua)) key = "macos";
    else if (/linux|x11/i.test(platform) || /linux/i.test(ua)) key = "linux";
    else if (/android/i.test(ua)) key = "android";
    const arch = /arm64|aarch64/i.test(ua) || navigator.userAgentData?.architecture === "arm" ? "arm64" : "x64";
    const labels = { windows: "Windows", macos: "macOS", linux: "Linux", android: "Android", unknown: "your system" };
    return { key, label: labels[key], arch };
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

function isAsset(asset, pattern) {
    return pattern.test(asset.name);
}

const PLATFORM_RULES = {
    windows: [/\.exe$/i],
    macos: [/\.dmg$/i],
    linux: [/\.AppImage$/i],
    android: [/\.apk$/i],
};

function chooseAsset(assets, os, arch) {
    const candidates = assets.filter((asset) => PLATFORM_RULES[os]?.some((pattern) => isAsset(asset, pattern)));
    if (!candidates.length) return null;
    if (os === "macos") {
        const wanted = arch === "arm64" ? /arm64|aarch64/i : /x64|x86_64|intel/i;
        return candidates.find((asset) => wanted.test(asset.name)) || candidates.find((asset) => /universal/i.test(asset.name)) || candidates[0];
    }
    if (os === "windows") {
        return candidates.find((asset) => /setup|installer/i.test(asset.name)) || candidates[0];
    }
    return candidates[0];
}

function assetLabel(name) {
    const lower = name.toLowerCase();
    if (lower.endsWith(".appimage")) return "AppImage";
    if (lower.endsWith(".deb")) return "Debian / Ubuntu (.deb)";
    if (lower.endsWith(".rpm")) return "Fedora (.rpm)";
    if (lower.endsWith(".tar.gz")) return "Linux archive (.tar.gz)";
    if (lower.endsWith(".exe")) return "Windows installer";
    if (lower.endsWith(".dmg")) return "macOS disk image";
    if (lower.endsWith(".zip")) return "ZIP archive";
    if (lower.endsWith(".apk")) return "Android APK";
    return name;
}

async function initDownloads() {
    const os = detectOS();
    const chip = $("#os-chip");
    const tag = $("#release-tag");
    const main = $("#download-main");
    const label = $("#download-label");
    const meta = $("#download-meta");
    const alt = $("#alt-downloads");

    if (chip) chip.textContent = os.key === "unknown" ? "Choose your download" : `${os.label} detected`;
    if (label) label.textContent = os.key === "unknown" ? "Download OmniYap" : `Download for ${os.label}`;

    let release = null;
    try {
        const response = await fetch(LATEST_API, { headers: { Accept: "application/vnd.github+json" } });
        if (response.ok) release = await response.json();
    } catch {
        /* offline or rate limited: fall back to the releases page */
    }

    if (!release) {
        if (tag) tag.textContent = "GitHub releases";
        if (meta) meta.textContent = "Could not load the release list — open GitHub to pick your build.";
        return;
    }

    const version = String(release.tag_name || release.name || "latest");
    if (tag) tag.textContent = version;
    $$("[data-version]").forEach((node) => (node.textContent = version.replace(/^v/, "")));

    const assets = Array.isArray(release.assets) ? release.assets : [];
    const asset = chooseAsset(assets, os.key, os.arch);

    if (asset) {
        main.href = asset.browser_download_url;
        main.removeAttribute("aria-disabled");
        label.textContent = `Download for ${os.label}`;
        meta.textContent = `${asset.name} · ${formatBytes(asset.size)} · ${release.published_at ? new Date(release.published_at).toLocaleDateString(undefined, { dateStyle: "medium" }) : "latest"}`;
    } else {
        main.href = RELEASES;
        main.setAttribute("aria-disabled", "true");
        label.textContent = `View ${os.label} builds`;
        meta.textContent = `No ${os.label} build in ${version}. Open GitHub for every release and platform.`;
    }

    const others = assets.filter((candidate) => candidate !== asset);
    alt.replaceChildren(
        ...others.map((candidate) =>
            Object.assign(document.createElement("a"), {
                href: candidate.browser_download_url,
                textContent: `${assetLabel(candidate.name)}${candidate.size ? ` · ${formatBytes(candidate.size)}` : ""}`,
                rel: "noopener",
                title: candidate.name,
            }),
        ),
    );
}

function initPlugins() {
    const grid = $("#plugin-grid");
    const search = $("#plugin-search");
    const tagsBox = $("#plugin-tags");
    const toggle = $("#plugin-toggle");
    const empty = $("#plugin-empty");
    if (!grid) return;

    let plugins = [];
    let activeTag = "all";
    let expanded = false;
    const LIMIT = 12;

    const matches = () => {
        const query = search?.value.trim().toLowerCase() || "";
        return plugins.filter((plugin) => {
            if (activeTag !== "all" && !plugin.tags.includes(activeTag)) return false;
            if (!query) return true;
            return `${plugin.name} ${plugin.description} ${plugin.tags.join(" ")}`.toLowerCase().includes(query);
        });
    };

    const draw = () => {
        const list = matches();
        const visible = expanded ? list : list.slice(0, LIMIT);
        grid.replaceChildren(
            ...visible.map((plugin) =>
                Object.assign(document.createElement("article"), {
                    className: "plugin",
                    innerHTML: `<h3></h3><p></p><div class="tags"></div>`,
                }),
            ),
        );
        visible.forEach((plugin, index) => {
            const card = grid.children[index];
            card.querySelector("h3").textContent = plugin.name;
            card.querySelector("p").textContent = plugin.description;
            card.querySelector(".tags").replaceChildren(
                ...plugin.tags.slice(0, 3).map((tag) => Object.assign(document.createElement("span"), { textContent: tag })),
            );
        });
        if (empty) empty.hidden = list.length > 0;
        if (toggle) {
            toggle.hidden = list.length <= LIMIT;
            toggle.textContent = expanded ? "Show less" : `Show all ${list.length}`;
            toggle.setAttribute("aria-expanded", String(expanded));
        }
    };

    fetch("./plugins.json")
        .then((response) => (response.ok ? response.json() : []))
        .then((data) => {
            plugins = Array.isArray(data) ? data : [];
            const counts = new Map();
            for (const plugin of plugins) for (const tag of plugin.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
            const tags = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag);
            const chip = (tag, active = false) => {
                const button = document.createElement("button");
                button.className = `chip${active ? " active" : ""}`;
                button.textContent = tag;
                button.dataset.tag = tag;
                return button;
            };
            tagsBox?.replaceChildren(chip("all", true), ...tags.map((tag) => chip(tag)));
            tagsBox?.addEventListener("click", (event) => {
                const button = event.target.closest(".chip");
                if (!button) return;
                activeTag = button.dataset.tag;
                $$(".chip", tagsBox).forEach((chip) => chip.classList.toggle("active", chip === button));
                expanded = false;
                draw();
            });
            draw();
        })
        .catch(() => {
            grid.replaceChildren(Object.assign(document.createElement("p"), { className: "plugin-empty", textContent: "The plugin list could not be loaded." }));
        });

    search?.addEventListener("input", () => {
        expanded = false;
        draw();
    });
    toggle?.addEventListener("click", () => {
        expanded = !expanded;
        draw();
        if (!expanded) $("#plugins")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

function initNav() {
    const button = $("#nav-toggle");
    const links = $("#nav-links");
    button?.addEventListener("click", () => {
        const open = links.classList.toggle("open");
        button.setAttribute("aria-expanded", String(open));
    });
    links?.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
            links.classList.remove("open");
            button?.setAttribute("aria-expanded", "false");
        }
    });
}

function initCopy() {
    const toast = $("#toast");
    let timer = null;
    const show = (text) => {
        if (!toast) return;
        toast.textContent = text;
        toast.classList.add("show");
        clearTimeout(timer);
        timer = setTimeout(() => toast.classList.remove("show"), 1900);
    };
    $$("[data-copy]").forEach((node) => {
        node.addEventListener("click", async () => {
            const text = node.getAttribute("data-copy");
            if (!text) return;
            try {
                await navigator.clipboard.writeText(text);
                show("Copied to clipboard");
            } catch {
                show("Could not copy — select the text manually");
            }
        });
    });
}

function initReveal() {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = $$(".feature, .step, .plugin, .stats div");
    targets.forEach((node) => {
        node.style.opacity = "0";
        node.style.transform = "translateY(10px)";
        node.style.transition = "opacity .4s ease, transform .4s ease";
    });
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.style.opacity = "1";
            entry.target.style.transform = "none";
            observer.unobserve(entry.target);
        }
    }, { rootMargin: "0px 0px -60px 0px" });
    targets.forEach((node) => observer.observe(node));
}

initNav();
initCopy();
initDownloads();
initPlugins();
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initReveal);
else initReveal();
