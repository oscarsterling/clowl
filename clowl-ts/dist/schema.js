/**
 * CLowl v0.2 JSON Schema Validation
 *
 * Validates CLowl messages against the v0.2 JSON Schema.
 * Zero runtime dependencies, no external schema validators.
 */
import { CLOWL_VERSION, VALID_PERFORMATIVES, VALID_DELEGATION_MODES, } from "./types.js";
/**
 * The CLowl v0.2 JSON Schema as a plain object.
 * Can be exported for use with external validators (Ajv, etc.).
 */
export const CLOWL_SCHEMA = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://clowl.dev/schema/v0.2/message.json",
    title: "CLowl Message",
    description: "A CLowl v0.2 agent-to-agent message",
    type: "object",
    required: ["clowl", "mid", "ts", "p", "from", "to", "cid", "body"],
    properties: {
        clowl: { type: "string", const: CLOWL_VERSION },
        mid: { type: "string", minLength: 1 },
        ts: { type: "integer", minimum: 0 },
        p: { type: "string", enum: [...VALID_PERFORMATIVES] },
        from: { type: "string", minLength: 1 },
        to: {
            oneOf: [
                { type: "string", minLength: 1 },
                { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
            ],
        },
        cid: { type: "string", minLength: 1 },
        body: {
            type: "object",
            required: ["t", "d"],
            properties: {
                t: { type: "string", minLength: 1 },
                d: { type: "object" },
            },
        },
        tid: { type: "string" },
        pid: { type: "string" },
        ctx: {
            type: "object",
            properties: {
                ref: { type: ["string", "null"] },
                inline: { type: ["string", "null"], maxLength: 2000 },
                hash: { type: ["string", "null"], minLength: 64, maxLength: 64 },
            },
        },
        auth: { type: "string" },
        det: { type: "boolean" },
    },
    additionalProperties: false,
};
/**
 * Validate a plain object against the CLowl v0.2 schema.
 * This is a lightweight, built-in validator. No external dependencies.
 */
export function validateSchema(data) {
    const errors = [];
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
        return { valid: false, errors: ["Message must be a JSON object"] };
    }
    const obj = data;
    // Check required fields
    const required = ["clowl", "mid", "ts", "p", "from", "to", "cid", "body"];
    for (const field of required) {
        if (!(field in obj)) {
            errors.push(`Missing required field: ${field}`);
        }
    }
    // If missing required fields, return early
    if (errors.length > 0) {
        return { valid: false, errors };
    }
    // clowl version
    if (obj.clowl !== CLOWL_VERSION) {
        errors.push(`clowl must be "${CLOWL_VERSION}", got ${JSON.stringify(obj.clowl)}`);
    }
    // mid
    if (typeof obj.mid !== "string" || obj.mid.length === 0) {
        errors.push("mid must be a non-empty string");
    }
    // ts
    if (typeof obj.ts !== "number" || !Number.isInteger(obj.ts) || obj.ts < 0) {
        errors.push("ts must be a non-negative integer");
    }
    // p (performative)
    if (typeof obj.p !== "string" ||
        !VALID_PERFORMATIVES.includes(obj.p)) {
        errors.push(`p must be one of: ${[...VALID_PERFORMATIVES].join(", ")}. Got ${JSON.stringify(obj.p)}`);
    }
    // from
    if (typeof obj.from !== "string" || obj.from.length === 0) {
        errors.push("from must be a non-empty string");
    }
    // to
    if (typeof obj.to === "string") {
        if (obj.to.length === 0) {
            errors.push("to must be a non-empty string or array");
        }
    }
    else if (Array.isArray(obj.to)) {
        if (obj.to.length === 0) {
            errors.push("to array must have at least one element");
        }
        else {
            for (let i = 0; i < obj.to.length; i++) {
                if (typeof obj.to[i] !== "string" || obj.to[i].length === 0) {
                    errors.push(`to[${i}] must be a non-empty string`);
                }
            }
        }
    }
    else {
        errors.push("to must be a string or array of strings");
    }
    // cid
    if (typeof obj.cid !== "string" || obj.cid.length === 0) {
        errors.push("cid must be a non-empty string");
    }
    // body
    if (typeof obj.body !== "object" || obj.body === null || Array.isArray(obj.body)) {
        errors.push("body must be an object");
    }
    else {
        const body = obj.body;
        if (typeof body.t !== "string" || body.t.length === 0) {
            errors.push("body.t must be a non-empty string");
        }
        if (typeof body.d !== "object" || body.d === null || Array.isArray(body.d)) {
            errors.push("body.d must be an object");
        }
    }
    // DLGT delegation_mode check
    if (obj.p === "DLGT" && typeof obj.body === "object" && obj.body !== null) {
        const body = obj.body;
        if (typeof body.d === "object" && body.d !== null) {
            const d = body.d;
            if (typeof d.delegation_mode !== "string" ||
                !VALID_DELEGATION_MODES.includes(d.delegation_mode)) {
                errors.push(`DLGT messages require body.d.delegation_mode to be one of: ${[...VALID_DELEGATION_MODES].join(", ")}`);
            }
        }
    }
    // Optional fields type checks
    if ("tid" in obj && typeof obj.tid !== "string") {
        errors.push("tid must be a string");
    }
    if ("pid" in obj && typeof obj.pid !== "string") {
        errors.push("pid must be a string");
    }
    if ("auth" in obj && typeof obj.auth !== "string") {
        errors.push("auth must be a string");
    }
    if ("det" in obj && typeof obj.det !== "boolean") {
        errors.push("det must be a boolean");
    }
    // ctx validation
    if ("ctx" in obj) {
        if (typeof obj.ctx !== "object" || obj.ctx === null || Array.isArray(obj.ctx)) {
            errors.push("ctx must be an object");
        }
        else {
            const ctx = obj.ctx;
            if ("ref" in ctx && ctx.ref !== null && typeof ctx.ref !== "string") {
                errors.push("ctx.ref must be a string or null");
            }
            if ("inline" in ctx && ctx.inline !== null) {
                if (typeof ctx.inline !== "string") {
                    errors.push("ctx.inline must be a string or null");
                }
                else if (ctx.inline.length > 2000) {
                    errors.push(`ctx.inline exceeds 2000 character limit (got ${ctx.inline.length})`);
                }
            }
            if ("hash" in ctx && ctx.hash !== null) {
                if (typeof ctx.hash !== "string") {
                    errors.push("ctx.hash must be a string or null");
                }
                else if (ctx.hash.length !== 64) {
                    errors.push(`ctx.hash must be a 64-char SHA-256 hex string (got ${ctx.hash.length} chars)`);
                }
            }
        }
    }
    // Check for unknown fields
    const knownFields = new Set([
        "clowl", "mid", "ts", "p", "from", "to", "cid", "body",
        "tid", "pid", "ctx", "auth", "det",
    ]);
    for (const key of Object.keys(obj)) {
        if (!knownFields.has(key)) {
            errors.push(`Unknown field: ${key}`);
        }
    }
    return { valid: errors.length === 0, errors };
}
//# sourceMappingURL=schema.js.map