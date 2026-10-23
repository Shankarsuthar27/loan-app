import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
/**
 * Generic Zod validation middleware factory.
 * Validates req.body against the provided schema.
 */
export declare const validate: (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validate.d.ts.map