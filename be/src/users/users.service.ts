import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Paginated } from '../common/pagination/paginated';
import { User } from './entities/user.entity';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findByEmailWithPassword(email);
  }

  async findByIdWithInstitution(id: string): Promise<User> {
    const user = await this.usersRepository.findByIdWithInstitution(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findStudents(
    institutionId: string,
    query: PaginationQueryDto,
  ): Promise<Paginated<User>> {
    const [items, total] = await this.usersRepository.findStudents(
      institutionId,
      { search: query.search, skip: query.skip, take: query.limit },
    );
    return new Paginated(items, total, query.page, query.limit);
  }

  /** 404 juga untuk mahasiswa institusi lain, agar keberadaannya tidak bocor. */
  async getStudent(institutionId: string, studentId: string): Promise<User> {
    const student = await this.usersRepository.findStudent(
      institutionId,
      studentId,
    );
    if (!student) throw new NotFoundException('Mahasiswa tidak ditemukan');
    return student;
  }
}
