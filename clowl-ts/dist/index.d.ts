/**
 * CLowl v0.2 - TypeScript Library
 *
 * A structured communication language for AI agent-to-agent messaging.
 * Zero runtime dependencies. Full TypeScript types.
 *
 * @packageDocumentation
 */
export { CLOWL_VERSION, VALID_PERFORMATIVES, VALID_DELEGATION_MODES, PERFORMATIVE_NAMES, CONVERSATION_STATES, STATE_EVENTS, TERMINAL_STATES, } from "./types.js";
export type { Performative, DelegationMode, Recipient, CLowlContext, CLowlBody, CLowlErrorData, CLowlCapsData, CLowlDelegationData, CLowlProgressData, CLowlMessageData, CLowlMessageOptions, ValidationError, ConversationState, StateEvent, StateTransition, } from "./types.js";
export { CLowlMessage, generateMid, generateCid, generateTid, createReq, createAck, createDone, createErr, createDlgt, createProg, createCaps, createCncl, createInf, createQry, } from "./message.js";
export { ConversationTracker, InvalidTransitionError, getNextState, getAllTransitions, } from "./state-machine.js";
export type { StateHistoryEntry } from "./state-machine.js";
export { translateToHuman, translateJsonToHuman, translateBatch, translateTrace, translateConversation, parseJsonl, } from "./translator.js";
export { validateSchema, CLOWL_SCHEMA, } from "./schema.js";
export type { SchemaValidationResult } from "./schema.js";
//# sourceMappingURL=index.d.ts.map