import { Injectable } from '@nestjs/common';
import { User } from './users.model';
import { InjectModel } from '@nestjs/sequelize';
import { CreateUserDto } from './dto/create-user.dto';
import { RolesService } from '../roles/roles.service';
import { Role } from '../roles/roles.model';
import { v4 as uuidv4 } from 'uuid';

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

  async getUsersByEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
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
}
