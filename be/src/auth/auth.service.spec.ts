import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/enums/role.enum';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const usersService = {
    findByEmailWithPassword: jest.fn(),
    findByIdWithInstitution: jest.fn(),
  };
  const jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt') };
  const config = { get: jest.fn().mockReturnValue('8h') };

  const user = (overrides: Partial<User> = {}) =>
    Object.assign(new User(), {
      id: 'user-id',
      institutionId: 'inst-a',
      email: 'keuangan@ucn.test',
      role: Role.FINANCE_ADMIN,
      isActive: true,
      password: bcrypt.hashSync('correct-password', 4),
      ...overrides,
    });

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('puts the institution id into the JWT payload', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(user());
    usersService.findByIdWithInstitution.mockResolvedValue(user());
    await expect(
      service.login({
        email: 'keuangan@ucn.test',
        password: 'correct-password',
      }),
    ).resolves.toMatchObject({
      accessToken: 'signed.jwt',
      tokenType: 'Bearer',
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      email: 'keuangan@ucn.test',
      role: Role.FINANCE_ADMIN,
      institutionId: 'inst-a',
    });
  });

  it('rejects a wrong password', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(user());
    await expect(
      service.login({ email: 'keuangan@ucn.test', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown email with the same error', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);
    await expect(
      service.login({ email: 'nobody@ucn.test', password: 'whatever' }),
    ).rejects.toThrow('Invalid email or password');
  });

  it('rejects an inactive account', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(
      user({ isActive: false }),
    );
    await expect(
      service.login({
        email: 'keuangan@ucn.test',
        password: 'correct-password',
      }),
    ).rejects.toThrow('Account is inactive');
  });
});
