# Equicord → OmniYap plugin matrix

Audit of every plugin directory in [Equicord](https://github.com/Equicord/Equicord):
`src/plugins` (164) plus `src/equicordplugins` (201) — **365 plugins**, checked October 2026.

Equicord is Vencord plus a large set of extra plugins. The base `src/plugins` tree is shared with
Vencord, so this matrix covers both projects. 97 plugins are
registered in OmniYap.

**Legend**

| | |
| --- | --- |
| ✅ **Ported** | Implemented for Yapper in `src/renderer/plugins/` |
| 🟡 **Native** | Yapper or OmniYap already does this without a plugin |
| 🔜 **Planned** | Yapper exposes the data/DOM needed; not implemented yet |
| 🧱 **Blocked** | Needs something Yapper does not expose (Discord internals, an API flag, a service key, …) |
| ⛔ **N/A** | Discord/RPC/VR/browser-specific; meaningless or impossible for Yapper |

**Totals:** 61 ported · 23 native · 67 planned · 171 blocked · 43 n/a

> Ported means "reimplemented against OmniYap's plugin API and Yapper's DOM/store", not a copy of
> Equicord source. Equicord plugins written against Discord's webpack modules, Flux stores or
> permission model cannot run on Yapper at all; those are marked blocked rather than pretended.

## All plugins

| Equicord plugin | Status | Notes for Yapper |
| --- | --- | --- |
| `accountPanelServerProfile` | ⛔ N/A | Discord account panel / per-server profiles. |
| `addAttachments` | ⛔ N/A | Editing attachments on an already-sent Discord message. |
| `advancedPermissions` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `altKrispSwitch` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `alwaysAnimate` | ✅ Ported | Keeps animated avatars/emoji running; Yapper animates them by default. |
| `alwaysExpandProfiles` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `alwaysExpandRoles` | ⛔ N/A | Discord role list UI. |
| `alwaysTrust` | ⛔ N/A | Discord trusted-domain flow. |
| `animalese` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `anonymiseFileNames` | ✅ Ported | Renames uploads before they leave the client. |
| `arRPC` | ⛔ N/A | Discord RPC bridge. |
| `atSomeone` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `autoDndWhilePlaying` | ⛔ N/A | Discord game/RPC detection. |
| `autoJumpToMessage` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `autoZipper` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `bannersEverywhere` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `baseDecoder` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `betterActivities` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `betterAudioPlayer` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `betterBanReasons` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `betterBlockedUsers` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `betterCommands` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `betterFolders` | ⛔ N/A | Yapper has no server folders. |
| `betterForwards` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `betterGifAltText` | ✅ Ported | Descriptive alt/title on GIF attachments. |
| `betterGifPicker` | ✅ Ported | Larger picker, more columns, focused search. |
| `betterImageEditor` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `betterInvites` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `betterPlusReacts` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `betterRoleContext` | ⛔ N/A | Discord role context menu. |
| `betterRoleDot` | ⛔ N/A | Discord role dot rendering. |
| `betterSessions` | ⛔ N/A | Discord account sessions. |
| `betterSettings` | 🔜 Planned | Reorganise Yapper's settings modal. |
| `betterUploadButton` | 🔜 Planned | Click/drop anywhere to upload. |
| `biggerStreamPreview` | ✅ Ported | Enlarges stream previews. |
| `blockKeywords` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `blockKrisp` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `blurNsfw` | 🔜 Planned | Needs Yapper's NSFW channel flag/UI. |
| `bypassPinPrompt` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `bypassStatus` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `callTimer` | ✅ Ported | Call duration badge in the user bar/voice header. |
| `channelBadges` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `channelTabs` | 🔜 Planned | Tabbed channels; not implemented yet. |
| `characterCounter` | ✅ Ported | Counter above the composer. |
| `cleanChannelName` | 🔜 Planned | Channel title hook; not implemented yet. |
| `cleanerChannelGroups` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `clearURLs` | ✅ Ported | Strips tracking parameters from links and copies. |
| `clickableRoles` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `clientSideBlock` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `clientTheme` | ⛔ N/A | Discord client theme internals; use OmniYap themes instead. |
| `clipUpload` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `clipsEnhancements` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `collapsibleUi` | 🔜 Planned | Layout hook; not implemented yet. |
| `colorSighted` | 🔜 Planned | Recolour Yapper presence dots. |
| `commandPalette` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `consoleJanitor` | 🔜 Planned | Filter noisy console output. |
| `consoleShortcuts` | ✅ Ported | Implemented as a native OmniYap plugin. |
| `contentWarning` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `copyEmojiMarkdown` | ✅ Ported | Right-click emoji → shortcode / image / URL. |
| `copyFileContents` | ✅ Ported | Copy buttons on code blocks. |
| `copyProfileColors` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `copyStatusUrls` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `copyStickerLinks` | 🟡 Native | Yapper has no stickers. |
| `copyUserMention` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `copyUserURLs` | 🔜 Planned | Add profile URLs to the native context menu. |
| `crashHandler` | 🟡 Native | OmniYap shows its own offline/crash screen. |
| `cursorBuddy` | 🔜 Planned | `oneko` is a similar mouse follower. |
| `customCommands` | ✅ Ported | `/shortcut` expansion in the composer. |
| `customFolderIcons` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `customIdle` | 🔜 Planned | Custom idle timer (`autoIdle` state exists). |
| `customRPC` | ⛔ N/A | Discord rich presence. |
| `customSounds` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `customStatusTimeouts` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `customTimestamps` | 🔜 Planned | Timestamp format options are planned. |
| `customUserColors` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `dearrow` | 🔜 Planned | DeArrow YouTube thumbnail service. |
| `declutter` | 🟡 Native | OmniYap's **HideClutter** plugin covers the same ground. |
| `decor` | ⛔ N/A | Discord avatar decorations; Yapper has decorations built in. |
| `devCompanion` | ⛔ N/A | Discord dev plugin loader. |
| `directFileDownload` | 🟡 Native | Downloads already go through Chromium. |
| `disableCallIdle` | 🟡 Native | OmniYap disables background throttling; calls keep running. |
| `disableCameras` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `discordDevBanner` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `dontRoundMyTimestamps` | 🔜 Planned | More precise timestamps. |
| `downloadAllAttachments` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `dragFavoriteEmotes` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `dragify` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `elementHighlighter` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `equiTweaks` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `equibopStreamFixes` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `equicordHelper` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `equicordToolbox` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `equissant` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `exitSounds` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `experiments` | ⛔ N/A | Discord experiment system. |
| `exportMessages` | 🔜 Planned | `MessageLogger` stores history; a dedicated exporter is planned. |
| `expressionCloner` | 🟡 Native | Yapper lets you use emoji everywhere already. |
| `f8break` | ⛔ N/A | Discord keybind internals. |
| `fakeNitro` | 🟡 Native | Everything Nitro sells is free on Yapper. |
| `fakeProfileThemes` | 🟡 Native | Profile themes are free on Yapper. |
| `fastDeleteChannels` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `favEmojiFirst` | 🔜 Planned | Recent/favourite emoji row in the picker. |
| `favoriteAnything` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `fileUpload` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `findReply` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `fixCodeblockGap` | 🔜 Planned | Pure CSS. |
| `fixFileExtensions` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `fixImagesQuality` | ✅ Ported | Requests original-resolution images. |
| `fixSpotifyEmbeds` | 🟡 Native | No Spotify embeds in Yapper. |
| `fixYoutubeEmbeds` | ✅ Ported | nocookie host, no related videos, fullscreen. |
| `followVoiceUser` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `fontLoader` | 🔜 Planned | `CustomFontFiles` imports local fonts; remote font loading is not implemented. |
| `forceOwnerCrown` | 🟡 Native | Yapper already marks the owner with a crown. |
| `frequentQuickSwitcher` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `friendCodes` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `friendInvites` | 🔜 Planned | Yapper has friend requests and invite links. |
| `friendTags` | 🔜 Planned | Local friend tags; not implemented yet. |
| `friendshipRanks` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `fullSearchContext` | 🔜 Planned | Context around search results. |
| `fullUserInChatbox` | 🔜 Planned | Show full user info in mention suggestions. |
| `fullVcPfp` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `gameActivityToggle` | 🔜 Planned | The desktop app already detects games; expose a toggle. |
| `ghosted` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `gifCollections` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `gifMaker` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `gifPaste` | ✅ Ported | Paste a GIF/video URL → send it. |
| `gifProviderSwitcher` | 🔜 Planned | If Yapper exposes multiple GIF providers. |
| `githubRepos` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `globalBadges` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `googleThat` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `greetStickerPicker` | 🟡 Native | No stickers in Yapper. |
| `guildPickerDumper` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `hideAttachments` | ✅ Ported | Per-channel attachment hiding with a header toggle. |
| `hideChatButtons` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `hideMessages` | 🔜 Planned | `WordFilter` and `HideMedia` cover parts of this; a manager is planned. |
| `hideServers` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `homeTyping` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `hopOn` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `husk` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `iLoveSpam` | ⛔ N/A | Discord in-joke plugin. |
| `iRememberYou` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `iconViewer` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `idleAutoRestart` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `ignoreActivities` | ⛔ N/A | Discord activity/RPC. |
| `ignoreCalls` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `imageFilename` | ✅ Ported | Filename caption under attachments. |
| `imageLink` | 🟡 Native | Images inside links already open the link. |
| `imageZoom` | ✅ Ported | Full-screen pan/zoom lightbox. |
| `implicitRelationships` | ⛔ N/A | Discord relationship graph. |
| `inRole` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `ingtoninator` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `instantScreenshare` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `invisibleChat` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `inviteDefaults` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `ircColors` | ✅ Ported | Stable per-username colours. |
| `jumpTo` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `keepCurrentChannel` | ✅ Ported | Restores the last channel per server/DM. |
| `keyboardNavigation` | 🔜 Planned | Full keyboard navigation; not implemented yet. |
| `keyboardSounds` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `keywordNotify` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `lastActive` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `limitlessScreenshare` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `loadingQuotes` | 🔜 Planned | Quotes on the boot screen. |
| `loginWithQR` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `markdownTables` | 🔜 Planned | Renderer hook for tables is planned. |
| `mediaPlaybackSpeed` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `memberCount` | ✅ Ported | Real total + online count from `memberCounts`/`online`. |
| `mentionAvatars` | ✅ Ported | Avatars on @mentions. |
| `messageBurst` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `messageClickActions` | ✅ Ported | Middle-click quote, Shift-click copy. |
| `messageColors` | 🔜 Planned | `MessageStyle` styles messages; per-message colours are planned. |
| `messageFetchTimer` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `messageLatency` | 🔜 Planned | Measure send→ack round trip. |
| `messageLinkEmbeds` | 🔜 Planned | Rich previews for message links. |
| `messageLinkTooltip` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `messageLogger` | ✅ Ported | Local edit/delete history with viewer. |
| `messageLoggerEnhanced` | 🔜 Planned | `MessageLogger` already keeps edits/deletes; the enhanced browser view is planned. |
| `messageNotifier` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `messagePeek` | 🔜 Planned | Preview-on-hover for links; not implemented yet. |
| `messageTranslate` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `micLoopbackTester` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `middleClickTweaks` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `moreCommands` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `moreQuickReactions` | ✅ Ported | One-click reaction bar (uses `toggleReaction`). |
| `moreStickers` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `moreUserTags` | 🔜 Planned | Needs role data beyond what Yapper exposes. |
| `moyai` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `musicControls` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `musicRichPresence` | ⛔ N/A | Discord rich presence. |
| `mutualGroupDMs` | ⛔ N/A | Discord group DM graph. |
| `neverPausePreviews` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `newGuildSettings` | ⛔ N/A | Discord guild onboarding. |
| `newPluginsManager` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `noBlockedMessages` | ✅ Ported | Hides blocked users' messages using `state.blocked`. |
| `noDeepLinks` | ⛔ N/A | Browser-only. |
| `noDevtoolsWarning` | 🟡 Native | Production builds do not show the warning. |
| `noF1` | ✅ Ported | F1 no longer opens help. |
| `noMaskedUrlPaste` | ✅ Ported | Raw URL paste instead of masked links. |
| `noMiddleClickPaste` | ✅ Ported | No accidental X11 middle-click paste. |
| `noMosaic` | ✅ Ported | Attachments stack instead of a mosaic. |
| `noNitroUpsell` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `noOnboardingDelay` | ✅ Ported | Skips the intro. |
| `noPendingCount` | ✅ Ported | Hides pending counters. |
| `noProfileThemes` | 🟡 Native | Themes are free on Yapper. |
| `noPushToTalk` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `noRPC` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `noReplyMention` | ✅ Ported | Replies don't re-ping the author. |
| `noRoleHeaders` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `noServerEmojis` | ✅ Ported | Hides the server emoji section. |
| `noSystemBadge` | ✅ Ported | Implemented as a native OmniYap plugin. |
| `noTypingAnimation` | ✅ Ported | Static typing indicator. |
| `noUnblockToJump` | ⛔ N/A | Discord block/jump flow. |
| `normalizeMessageLinks` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `notificationTitle` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `notificationVolume` | 🔜 Planned | Attenuate notification sounds with WebAudio. |
| `onePingPerDM` | 🔜 Planned | Deduplicate repeated DM pings. |
| `openInApp` | ⛔ N/A | Discord link handling. |
| `orbolayBridge` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `overrideForumDefaults` | ⛔ N/A | No forums. |
| `partyMode` | 🔜 Planned | Cosmetic overlay; not implemented yet. |
| `pauseInvitesForever` | 🔜 Planned | Depends on Yapper's invite model. |
| `pendingFriendRequest` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `permissionFreeWill` | ⛔ N/A | Discord permission bitfields. |
| `permissionsViewer` | 🔜 Planned | Yapper has roles but no Discord permission grid. |
| `petpet` | ✅ Ported | Alt-click an avatar to pet it. |
| `pictureInPicture` | ✅ Ported | PiP button on chat videos. |
| `pinDms` | 🔜 Planned | Reorder the DM list locally. |
| `pinIcon` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `pingNotifications` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `plainFolderIcon` | ⛔ N/A | No folders. |
| `platformIndicators` | ⛔ N/A | Discord client platform badges. |
| `platformSpoofer` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `polishWording` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `previewMessage` | 🔜 Planned | Preview a linked message in a popover. |
| `profileSets` | 🔜 Planned | Saved profile presets; not implemented yet. |
| `questify` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `quickMention` | ✅ Ported | @ button on each message. |
| `quickReply` | ✅ Ported | Double-click or R to reply. |
| `quickThemeSwitcher` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `quoter` | ✅ Ported | Implemented as the **Quoter** plugin. |
| `randomVoice` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `reactErrorDecoder` | ⛔ N/A | Discord React error decoder. |
| `reactionTimestamps` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `readAllNotificationsButton` | ✅ Ported | Marks every unread channel read. |
| `recentDMSwitcher` | 🔜 Planned | DM switcher integration; not implemented yet. |
| `relationshipNotifier` | 🔜 Planned | Friend request notifications. |
| `remix` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `repeatMessages` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `replaceGoogleSearch` | 🔜 Planned | Search selection with another engine. |
| `replyPingControl` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `replyTimestamp` | ✅ Ported | Time on reply previews (uses `reply_to_id`). |
| `revealAllSpoilers` | ✅ Ported | Unblurs spoilers. |
| `reverseImageSearch` | 🔜 Planned | Lens/Yandex/TinEye from an image. |
| `reviewDB` | ⛔ N/A | Discord-only service. |
| `richMagnetLinks` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `richPresence` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `roleColorEverywhere` | 🔜 Planned | Yapper has roles and role colours. |
| `rpcEditor` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `saveFavoriteGIFs` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `scheduledMessages` | 🟡 Native | OmniYap ships **ScheduleMessages**. |
| `screenRecorder` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `searchFix` | 🟡 Native | Yapper's search already debounces and keeps focus. |
| `secretRingTone` | 🔜 Planned | Yapper has ringing calls. |
| `sedEnhanced` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `sekaiStickers` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `sendTimestamps` | 🔜 Planned | Insert a timestamp into the composer. |
| `serverInfo` | ✅ Ported | Implemented as a native OmniYap plugin. |
| `serverListIndicators` | ✅ Ported | Implemented as a native OmniYap plugin. |
| `serverSearch` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `shikiCodeblocks` | 🔜 Planned | Syntax highlighting in code blocks. |
| `showAllMessageButtons` | ✅ Ported | Always-visible message actions. |
| `showBadgesInChat` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `showConnections` | ⛔ N/A | Discord connections. |
| `showHiddenChannels` | ⛔ N/A | Discord permission-hidden channels. |
| `showHiddenThings` | 🔜 Planned | Reveal Yapper's hidden UI bits where applicable. |
| `showMeYourName` | ✅ Ported | Handle next to display name. |
| `showMessageEmbeds` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `showResourceChannels` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `showRolesInChat` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `showSongName` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `showTimeoutDuration` | 🔜 Planned | If Yapper exposes timeouts. |
| `sidebarChat` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `signature` | 🔜 Planned | Needs a per-user signature store. |
| `silenceUsers` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `silentMessageToggle` | 🧱 Blocked | No silent-message flag was observed in Yapper's send path. |
| `silentTyping` | ✅ Ported | Drops outgoing typing frames on the socket. |
| `snowfall` | 🔜 Planned | Cosmetic overlay; not implemented yet. |
| `songLink` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `songSpotlight` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `sortFriendRequests` | 🔜 Planned | Yapper friends have `pending`/`accepted` states. |
| `splitLargeMessages` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `spotifyCrack` | ⛔ N/A | Discord Spotify integration. |
| `spotifyShareCommands` | ⛔ N/A | Discord Spotify integration. |
| `startupTimings` | ✅ Ported | Boot stage timings. |
| `statusPresets` | 🔜 Planned | Status presets need Yapper's presence API. |
| `statusWhileActive` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `steamStatusSync` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `stickerBlocker` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `stickerPaste` | 🟡 Native | No stickers. |
| `stopAutoUnread` | 🟡 Native | Yapper only marks a channel read when you open it. |
| `streaks` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `streamerModeOnStream` | ⛔ N/A | Discord streaming detection. |
| `streamingCodecDisabler` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `superReactionTweaks` | ⛔ N/A | Yapper has no super reactions. |
| `talkInReverse` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `textReplace` | ✅ Ported | Per-user find/replace rules. |
| `themeAttributes` | ✅ Ported | Implemented as a native OmniYap plugin. |
| `themeLibrary` | 🟡 Native | OmniYap has Themes and Quick CSS built in. |
| `tidalEmbeds` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `timezones` | 🔜 Planned | Needs a per-user timezone store. |
| `title` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `toastNotifications` | 🟡 Native | The desktop app already uses native notifications. |
| `toggleVideoBind` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `toneIndicators` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `translate` | 🧱 Blocked | Needs a translation API/key; no Yapper endpoint. |
| `translatePlus` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `triviaAI` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `typingIndicator` | 🟡 Native | Yapper has a typing line. |
| `typingTweaks` | ✅ Ported | Avatars, colour and name count. |
| `unindent` | ✅ Ported | Trims leading indentation before send. |
| `unitConverter` | 🔜 Planned | Composer hook is straightforward, not implemented yet. |
| `universalMention` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `unlimitedAccounts` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `unlockedAvatarZoom` | 🟡 Native | OmniYap's ViewIcons viewer covers it. |
| `unreadBadgeCount` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `unsuppressEmbeds` | 🔜 Planned | Messages carry `suppress_embeds`. |
| `urlHighlighter` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `userMessagesPronouns` | ✅ Ported | Uses Yapper profile `pronouns`. |
| `userVoiceShow` | 🔜 Planned | Show the voice channel in a profile. |
| `userpfp` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `userpluginInstaller` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `usrbg` | ⛔ N/A | Discord profile backgrounds; Yapper has banners. |
| `validReply` | ⛔ N/A | Discord reply validation. |
| `validUser` | ⛔ N/A | Discord user validation. |
| `vcDoubleClick` | 🔜 Planned | Double-click a voice channel to join. |
| `vcNarrator` | 🔜 Planned | TTS on join/leave (Yapper has `voiceMembers`). |
| `vcPanelSettings` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `viewIcons` | ✅ Ported | Full-size avatar viewer. |
| `viewRaw` | ✅ Ported | Inspect a message's raw JSON. |
| `voiceButtons` | 🔜 Planned | Voice panel buttons; not implemented yet. |
| `voiceChannelLog` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `voiceChatUtils` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `voiceDownload` | 🔜 Planned | Voice messages carry `attachment_path`. |
| `voiceJoinMessages` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `voiceMessageTranscriber` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `voiceMessages` | 🔜 Planned | Recording requires Yapper's upload flow. |
| `voiceMessagesInBackground` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `voiceRejoin` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `voiceStats` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `volumeBooster` | ✅ Ported | WebAudio gain up to 500%. |
| `waitForSlot` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `webContextMenus` | ✅ Ported | Native menus for messages/links/images/text. |
| `webKeybinds` | ✅ Ported | Channel navigation, mute/deafen. |
| `webPWA` | ⛔ N/A | Browser-only. |
| `webScreenShare` | 🟡 Native | The desktop app has a full screen-sharing picker. |
| `webScreenShareFixes` | ⛔ N/A | Browser-only. |
| `webpackTarball` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `whitelistedEmojis` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `whoReacted` | 🔜 Planned | `reactions` entries include `user_id`. |
| `whosWatching` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `wigglyText` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
| `writeUpperCase` | 🔜 Planned | Composer transform; not implemented yet. |
| `xsOverlay` | ⛔ N/A | VR overlay. |
| `youtubeAdblock` | ✅ Ported | App setting **Block YouTube ads** (session webRequest). |
| `zipPreview` | 🧱 Blocked | Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent. |
