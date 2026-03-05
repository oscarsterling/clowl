/**
 * CLowl v0.2 Translator
 *
 * Converts CLowl JSON messages to plain English descriptions.
 * Uses CLowlMessage.toHuman() under the hood, plus batch and trace support.
 */
import type { CLowlMessageData } from "./types.js";
/**
 * Translate a single CLowl JSON object to a human-readable English string.
 */
export declare function translateToHuman(data: CLowlMessageData): string;
/**
 * Translate a JSON string (single message) to human-readable English.
 */
export declare function translateJsonToHuman(jsonStr: string): string;
/**
 * Translate an array of CLowl messages to human-readable English.
 * Messages are sorted by timestamp before translation.
 */
export declare function translateBatch(messages: CLowlMessageData[]): string[];
/**
 * Filter and translate messages belonging to a specific trace ID.
 * Returns a formatted trace timeline string.
 */
export declare function translateTrace(messages: CLowlMessageData[], tid: string): string;
/**
 * Filter and translate messages belonging to a specific conversation.
 * Returns a formatted conversation timeline string.
 */
export declare function translateConversation(messages: CLowlMessageData[], cid: string): string;
/**
 * Parse a JSONL (newline-delimited JSON) string into CLowl message data objects.
 * Skips malformed lines silently.
 */
export declare function parseJsonl(jsonl: string): CLowlMessageData[];
//# sourceMappingURL=translator.d.ts.map