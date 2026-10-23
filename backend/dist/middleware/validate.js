"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
/**
 * Generic Zod validation middleware factory.
 * Validates req.body against the provided schema.
 */
const validate = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    }
    catch (err) {
        if (err instanceof zod_1.ZodError) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: err.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
            return;
        }
        next(err);
    }
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map