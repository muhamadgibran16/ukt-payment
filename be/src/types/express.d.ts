import { JwtPayload } from '../auth/types/jwt-payload';

declare global {
  namespace Express {
    interface Request {
      /** Diisi oleh JwtAuthGuard setelah token terverifikasi. */
      user?: JwtPayload;
    }
  }
}

export {};
