import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Tandai route agar bisa diakses tanpa JWT (JwtAuthGuard aktif secara global). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
