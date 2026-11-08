import { Injectable } from '@nestjs/common';
import { DataSource, ILike, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from './enums/role.enum';

/**
 * Akses data user. Method yang mengembalikan data tenant mewajibkan
 * `institutionId`. Pengecualian yang disengaja:
 * - `findByEmailWithPassword`: login terjadi sebelum institusi diketahui.
 * - `findByIdWithInstitution`: id berasal dari JWT user itu sendiri.
 *
 * Repository TypeORM disimpan private (bukan `extends Repository<User>`)
 * agar method tanpa scope seperti `find()` tidak bisa dipanggil dari luar.
 */
@Injectable()
export class UsersRepository {
  private readonly repo: Repository<User>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(User);
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  findByIdWithInstitution(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      relations: { institution: true },
    });
  }

  findStudent(institutionId: string, studentId: string): Promise<User | null> {
    return this.repo.findOneBy({
      institutionId,
      id: studentId,
      role: Role.STUDENT,
    });
  }

  findStudents(
    institutionId: string,
    opts: { search?: string; skip: number; take: number },
  ): Promise<[User[], number]> {
    const search = opts.search?.trim();
    const base = { institutionId, role: Role.STUDENT };
    const where = search
      ? [
          { ...base, name: ILike(`%${search}%`) },
          { ...base, nim: ILike(`%${search}%`) },
        ]
      : base;
    return this.repo.findAndCount({
      where,
      order: { nim: 'ASC' },
      skip: opts.skip,
      take: opts.take,
    });
  }
}
