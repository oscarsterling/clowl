/**
 * CLowl v0.2 Translator
 *
 * Converts CLowl JSON messages to plain English descriptions.
 * Uses CLowlMessage.toHuman() under the hood, plus batch and trace support.
 */
import { CLowlMessage } from "./message.js";
/**
 * Translate a single CLowl JSON object to a human-readable English string.
 */
export function translateToHuman(data) {
    const msg = CLowlMessage.fromDict(data);
    return msg.toHuman();
}
/**
 * Translate a JSON string (single message) to human-readable English.
 */
export function translateJsonToHuman(jsonStr) {
    const msg = CLowlMessage.fromJson(jsonStr);
    return msg.toHuman();
}
/**
 * Translate an array of CLowl messages to human-readable English.
 * Messages are sorted by timestamp before translation.
 */
export function translateBatch(messages) {
    const sorted = [...messages].sort((a, b) => a.ts - b.ts);
    return sorted.map((m) => {
        const msg = CLowlMessage.fromDict(m);
        return msg.toHuman();
    });
}
/**
 * Filter and translate messages belonging to a specific trace ID.
 * Returns a formatted trace timeline string.
 */
export function translateTrace(messages, tid) {
    const traceMessages = messages
        .filter((m) => m.tid === tid)
        .sort((a, b) => a.ts - b.ts);
    if (traceMessages.length === 0) {
        return `No messages found for trace: ${tid}`;
    }
    const header = `=== Trace: ${tid} (${traceMessages.length} messages) ===\n`;
    const lines = traceMessages.map((m) => {
        const msg = CLowlMessage.fromDict(m);
        return msg.toHuman();
    });
    return header + "\n" + lines.join("\n");
}
/**
 * Filter and translate messages belonging to a specific conversation.
 * Returns a formatted conversation timeline string.
 */
export function translateConversation(messages, cid) {
    const convMessages = messages
        .filter((m) => m.cid === cid)
        .sort((a, b) => a.ts - b.ts);
    if (convMessages.length === 0) {
        return `No messages found for conversation: ${cid}`;
    }
    const header = `=== Conversation: ${cid} (${convMessages.length} messages) ===\n`;
    const lines = convMessages.map((m) => {
        const msg = CLowlMessage.fromDict(m);
        return msg.toHuman();
    });
    return header + "\n" + lines.join("\n");
}
/**
 * Parse a JSONL (newline-delimited JSON) string into CLowl message data objects.
 * Skips malformed lines silently.
 */
export function parseJsonl(jsonl) {
    const messages = [];
    const lines = jsonl.split("\n").filter((line) => line.trim());
    for (const line of lines) {
        try {
            const data = JSON.parse(line);
            if (data.clowl && data.mid && data.p) {
                messages.push(data);
            }
        }
        catch {
            // Skip malformed lines
        }
    }
    return messages;
}
//# sourceMappingURL=translator.js.map