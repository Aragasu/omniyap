import { definePlugin, messages } from "../core/api.js";
import { addMessageAction, downloadUrl } from "./_shared.js";

const AUDIO = /\.(ogg|oga|opus|mp3|wav|m4a|webm|flac)(\?|$)/i;

function voiceFiles(message) {
    const files = [];
    if (typeof message?.voice_url === "string") files.push({ url: message.voice_url, name: "voice-message.ogg" });
    for (const attachment of message?.attachments || []) {
        const url = attachment?.url || attachment?.path || attachment?.href;
        if (!url) continue;
        const type = String(attachment?.type || attachment?.mime || "");
        if (AUDIO.test(url) || AUDIO.test(type) || /audio|voice/i.test(type)) {
            files.push({ url, name: attachment?.name || attachment?.filename || String(url).split("/").pop() || "voice-message.ogg" });
        }
    }
    return files;
}

function absolute(url) {
    try {
        return new URL(url, location.origin).href;
    } catch {
        return url;
    }
}

export default definePlugin({
    name: "VoiceDownload",
    description: "Adds a download button to voice messages and audio attachments.",
    authors: [{ name: "OmniYap" }],
    tags: ["voice", "media", "utility"],

    start(ctx) {
        const decorate = ({ el, message }) => {
            const files = voiceFiles(message);
            if (!files.length || el.querySelector('[data-omniyap-action="Voice download"]')) return;
            addMessageAction(el, {
                label: "Voice download",
                title: "Download this voice message",
                html: "⤓",
                onClick: () => {
                    for (const file of files) downloadUrl(absolute(file.url), file.name);
                    ctx.toast(files.length === 1 ? "Download started" : `${files.length} downloads started`, { type: "success" });
                },
            });
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`[data-omniyap-action="Voice download"]{font-size:14px;width:26px;height:26px;padding:0}`);
    },
});
