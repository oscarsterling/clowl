/**
 * CLowl v0.2 - TypeScript Library
 *
 * A structured communication language for AI agent-to-agent messaging.
 * Zero runtime dependencies. Full TypeScript types.
 *
 * @packageDocumentation
 */
// Types
export { CLOWL_VERSION, VALID_PERFORMATIVES, VALID_DELEGATION_MODES, PERFORMATIVE_NAMES, CONVERSATION_STATES, STATE_EVENTS, TERMINAL_STATES, } from "./types.js";
// Message creation and validation
export { CLowlMessage, generateMid, generateCid, generateTid, createReq, createAck, createDone, createErr, createDlgt, createProg, createCaps, createCncl, createInf, createQry, } from "./message.js";
// State machine
export { ConversationTracker, InvalidTransitionError, getNextState, getAllTransitions, } from "./state-machine.js";
// Translator
export { translateToHuman, translateJsonToHuman, translateBatch, translateTrace, translateConversation, parseJsonl, } from "./translator.js";
// Schema validation
export { validateSchema, CLOWL_SCHEMA, } from "./schema.js";
//# sourceMappingURL=index.js.map