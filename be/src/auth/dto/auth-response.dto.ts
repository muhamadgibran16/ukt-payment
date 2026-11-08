import { User } from '../../users/entities/user.entity';

export class AuthResponseDto {
  accessToken!: string;
  tokenType!: 'Bearer';
  /** Masa berlaku token, sesuai JWT_EXPIRES_IN. @example "8h" */
  expiresIn!: string;
  user!: User;
}
