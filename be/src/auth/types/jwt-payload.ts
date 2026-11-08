import { Role } from '../../users/enums/role.enum';

export interface JwtPayload {
  /** User ID */
  sub: string;
  email: string;
  role: Role;
  /**
   * Institusi pemilik user. SATU-SATUNYA sumber institution_id untuk scoping
   * data; jangan pernah mengambil institution_id dari body/query/params.
   */
  institutionId: string;
}
