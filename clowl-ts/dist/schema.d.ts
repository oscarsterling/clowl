/**
 * CLowl v0.2 JSON Schema Validation
 *
 * Validates CLowl messages against the v0.2 JSON Schema.
 * Zero runtime dependencies, no external schema validators.
 */
/** Result of schema validation */
export interface SchemaValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * The CLowl v0.2 JSON Schema as a plain object.
 * Can be exported for use with external validators (Ajv, etc.).
 */
export declare const CLOWL_SCHEMA: {
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://clowl.dev/schema/v0.2/message.json";
    readonly title: "CLowl Message";
    readonly description: "A CLowl v0.2 agent-to-agent message";
    readonly type: "object";
    readonly required: readonly ["clowl", "mid", "ts", "p", "from", "to", "cid", "body"];
    readonly properties: {
        readonly clowl: {
            readonly type: "string";
            readonly const: "0.2";
        };
        readonly mid: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly ts: {
            readonly type: "integer";
            readonly minimum: 0;
        };
        readonly p: {
            readonly type: "string";
            readonly enum: readonly ["REQ", "INF", "ACK", "ERR", "DLGT", "DONE", "CNCL", "QRY", "PROG", "CAPS"];
        };
        readonly from: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly to: {
            readonly oneOf: readonly [{
                readonly type: "string";
                readonly minLength: 1;
            }, {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly minItems: 1;
            }];
        };
        readonly cid: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly body: {
            readonly type: "object";
            readonly required: readonly ["t", "d"];
            readonly properties: {
                readonly t: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly d: {
                    readonly type: "object";
                };
            };
        };
        readonly tid: {
            readonly type: "string";
        };
        readonly pid: {
            readonly type: "string";
        };
        readonly ctx: {
            readonly type: "object";
            readonly properties: {
                readonly ref: {
                    readonly type: readonly ["string", "null"];
                };
                readonly inline: {
                    readonly type: readonly ["string", "null"];
                    readonly maxLength: 2000;
                };
                readonly hash: {
                    readonly type: readonly ["string", "null"];
                    readonly minLength: 64;
                    readonly maxLength: 64;
                };
            };
        };
        readonly auth: {
            readonly type: "string";
        };
        readonly det: {
            readonly type: "boolean";
        };
    };
    readonly additionalProperties: false;
};
/**
 * Validate a plain object against the CLowl v0.2 schema.
 * This is a lightweight, built-in validator. No external dependencies.
 */
export declare function validateSchema(data: unknown): SchemaValidationResult;
//# sourceMappingURL=schema.d.ts.map