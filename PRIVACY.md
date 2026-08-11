# Privacy Policy

*Last updated: August 2026*

This privacy policy explains how **shaderBOT** ("the Bot") collects, uses, and stores data when operating on the shaderLABS Discord server ("the Server").

By using the Server, you acknowledge and consent to the data practices described in this policy.

---

## Data We Collect

The Bot processes the following categories of data:

### User Identifiers
- **Discord user IDs** — collected for all moderation actions (bans, mutes, kicks, warns, notes, appeals, tracking), project ownership records, and audit logging.
- **Moderator IDs** — recorded alongside moderation actions for accountability.

### Message Data
- **Message content** — read for spam detection, blacklist enforcement, automatic response matching, media-only channel validation, and logging of edited/deleted messages. This includes content from text channels, threads, and voice channel messages.
- **Message metadata** — timestamps, channel IDs, attachment URLs, embed data, and message IDs.
- **Edit history** — both old and new content of edited messages are logged.
- **Deleted messages** — content of deleted messages is logged, and when entire channels or threads are deleted, all messages may be backed up.

### Member Data
- **Join/leave events** — recorded for raid detection and user tracking.
- **Profile changes** — nickname changes, display name changes, global name changes, and avatar changes are logged for tracked users.
- **Voice state updates** — voice channel join, leave, and move events are logged.

### Moderation Data
- Reasons, severity levels, context URLs (pointing to relevant Discord messages), appeal messages, and timestamps for all moderation actions.
- Warning points with time-based decay.

### Project Data
- Owner user IDs, channel IDs, role IDs, and GitHub webhook secrets for project management features.

---

## How We Use Your Data

All data is used exclusively for the operation and moderation of the shaderLABS Discord server:

| Purpose | Description |
|---|---|
| **Moderation** | Enforcing server rules through bans, mutes, kicks, warnings, notes, and appeal management. |
| **Spam Protection** | Detecting similar messages sent across multiple channels and mass-mention spam. |
| **Raid Protection** | Identifying and automatically banning coordinated join raids based on account age and username similarity. |
| **Blacklist Enforcement** | Deleting messages containing configured blacklisted strings and automatically muting the author. |
| **Automatic Responses** | Triggering predefined automated replies based on regex pattern matching against message content. |
| **Message Logging** | Recording edited and deleted messages for moderation transparency and dispute resolution. |
| **Channel Backups** | Creating encrypted backups of channels and threads when they are deleted, preserving message history. |
| **Media-Only Enforcement** | Ensuring messages in designated media-only channels contain attachments or links. |
| **User Tracking** | Monitoring join/leave patterns and profile changes for users under active moderation. |
| **Project Management** | Managing project channels, roles, banners, and GitHub release notifications. |

---

## Data Storage & Retention

### PostgreSQL Database
- **Stored:** Moderation records (bans, mutes, kicks, warns, notes, appeals, tracking), project configurations, and channel lock/slowmode states.
- **Retention:** Indefinite. This data serves as a permanent moderation audit trail.
- **Access:** Restricted to server members with the appropriate Discord permissions (`KickMembers`, `BanMembers`, `ManageMessages`, `ManageGuild`).

### Encrypted Backup Files
- **Stored:** Full message content, author usernames, author IDs, embed data, and attachment URLs from deleted channels, deleted threads, and bulk-deleted messages.
- **Encryption:** AES-256-GCM with a server-controlled key.
- **Retention:** Automatically deleted 4 weeks after creation.

### In-Memory Caches
- **Stored:** Recent messages for spam detection, recently translated messages, and raid detection data.
- **Retention:** Ephemeral. Caches are bounded by configurable lengths and cleared on bot restart. No data from caches is written to persistent storage.

### Discord Log Channels
- **Stored:** Moderation action summaries, edited/deleted message logs, spam alerts, and voice state changes are sent as messages to designated Discord channels.
- **Retention:** Governed by Discord's own data retention policies. The Bot cannot delete these messages once sent.

---

## Third-Party Data Sharing

**The Bot does not share data with any third-party services.**

- No data is sold, traded, or transferred to external parties.
- No analytics services, advertising networks, or tracking scripts are used.
- GitHub webhook payloads are received and processed solely for forwarding release notifications to the relevant Discord channel. They are not stored or forwarded elsewhere.

---

## Data Security

- **Encryption at rest:** Channel backups are encrypted using **AES-256-GCM** with a 256-bit key stored in an environment variable.
- **Access control:** Moderation commands and data access are gated by Discord's permission system. Only members with `KickMembers`, `BanMembers`, `ManageMessages`, or `ManageGuild` permissions can read moderation data.
- **Web API security:** The HTTP API uses OAuth2 authentication with http-only signed cookies and short-lived sessions (24 hours).
- **Environment isolation:** Sensitive credentials (bot token, database passwords, encryption keys) are stored in environment variables, never in the codebase.

---

## Your Rights & Choices

The Bot is an integral part of the shaderLABS server's moderation infrastructure. As such:

- **All non-bot messages** sent in the Server are processed by the Bot's moderation, anti-spam, and enforcement systems. Message content is read in real time for these purposes.
- **No opt-out mechanism** is available from the Bot's processing, as it would compromise the Server's ability to enforce its rules consistently.
- **By being a member of the Server**, you consent to the Bot processing your messages and member data as described in this policy.
- **Data deletion requests** may be directed to the Server's moderation team. Note that moderation records are retained indefinitely as an audit trail and may not be removable in all cases.

---

## Changes to This Policy

Updates to this privacy policy will be communicated through the shaderLABS Discord server. Continued use of the Server after changes constitutes acceptance of the updated policy.

---

## Contact

For questions or concerns about this privacy policy or the Bot's data practices, please:

- Open an issue on the [shaderBOT GitHub repository](https://github.com/shaderLABS/shaderBOT)
- Contact the shaderLABS moderation team on Discord

---

*This bot is open-source software. You can review the source code at [github.com/shaderLABS/shaderBOT](https://github.com/shaderLABS/shaderBOT).*
