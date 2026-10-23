import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    userId?: string;
}
/**
 * JWT Authentication middleware.
 * Expects Authorization: Bearer <token> header.
 */
export declare const authenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map