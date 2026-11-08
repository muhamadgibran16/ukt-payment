import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { normalizeEmail } from '../../common/transformers/string.transformers';

export class LoginDto {
  /** @example "keuangan@ucn.test" */
  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  /** @example "Password123!" */
  @IsString()
  @IsNotEmpty()
  password!: string;
}
