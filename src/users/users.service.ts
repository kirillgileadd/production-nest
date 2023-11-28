import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { User } from './users.model';
import { InjectModel } from '@nestjs/sequelize';
import { CreateUserDto } from './dto/create-user.dto';
import { RolesService } from '../roles/roles.service';
import { Role } from '../roles/roles.model';
import { v4 as uuidv4 } from 'uuid';
import { AddRoleDto } from './dto/add-role.dto';
import { BanUserDto } from './dto/ban-user.dto';
import * as Http from 'http';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private userRepository: typeof User,
    private roleSevice: RolesService,
  ) {}

  async createUser(dto: CreateUserDto) {
    const activationLink: string = uuidv4();
    const user = await this.userRepository.create({
      ...dto,
      activationLink: activationLink,
    });
    const role = await this.roleSevice.getRoleByValue('USER');

    await user.$set('roles', [role.id]);
    user.roles = [role];
    return user;
  }

  async getAllUsers() {
    const users = await this.userRepository.findAll({
      include: [
        {
          model: Role,
          attributes: ['value', 'id'], // Укажите только те атрибуты, которые вам нужны
          through: { attributes: [] }, // Исключите атрибуты, связанные с промежуточной таблицей
        },
      ],
    });

    return users;
  }

  async getUsersByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      include: { all: true },
    });

    return user;
  }

  async getUserByForgotPasswordLink(token: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { forgotPasswordLink: token },
      include: { all: true },
    });
    return user;
  }

  async getUsersById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      include: { all: true },
    });

    return user;
  }

  async getUsersByActivationLink(activationLink: string) {
    const user = await this.userRepository.findOne({
      where: { activationLink },
      include: { all: true },
    });

    return user || null;
  }

  async addRole(dto: AddRoleDto) {
    const user = await this.userRepository.findByPk(dto.userId);
    const role = await this.roleSevice.getRoleByValue(dto.value);

    if (role && user) {
      await user.$add('roles', role);
      return dto;
    }

    throw new HttpException(
      'Пользователь или роль ненайдены',
      HttpStatus.NOT_FOUND,
    );
  }

  async ban(dto: BanUserDto) {
    const user = await this.userRepository.findByPk(dto.userId);
    if (user) {
      await user.update({ banReason: dto.banReason, banned: true });
      return user;
    }

    throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
  }
}
