import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../mail/mail.service';
import { TokenService } from '../token/token.service';
import { UserDto } from '../users/dto/user.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private mailService: MailService,
    private tokenService: TokenService,
  ) {}

  async login(createUserDto: CreateUserDto) {
    const user = await this.validateUser(createUserDto);
    return await this.setTokens({
      email: user.email,
      id: user.id,
      isActivated: user.isActivated,
    });
  }

  async registration(createUserDto: CreateUserDto) {
    try {
      const candidate = await this.userService.getUsersByEmail(
        createUserDto.email,
      );

      if (candidate) {
        throw new HttpException(
          'Пользователь с таким именем уже существует',
          HttpStatus.BAD_REQUEST,
        );
      }
      const hashPassword = await bcrypt.hash(createUserDto.password, 5);
      const user = await this.userService.createUser({
        ...createUserDto,
        password: hashPassword,
      });
      await this.mailService.sendActivationMail(
        user.email,
        `${process.env.API_URL}/auth/activate/${user.activationLink}`,
      );
      return await this.setTokens({
        email: user.email,
        id: user.id,
        isActivated: user.isActivated,
      });
    } catch (error) {
      throw new HttpException(
        'Ошибка при регистрации пользователя',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async activate(activationLink: string) {
    try {
      const user =
        await this.userService.getUsersByActivationLink(activationLink);

      if (!user) {
        throw new HttpException(
          'Пользователь не найден',
          HttpStatus.BAD_REQUEST,
        );
      }
      await user.update({ isActivated: true });
    } catch (error) {
      throw new HttpException(
        'Ошибка при активации пользователя',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async logout(refreshToken: string) {
    const token = await this.tokenService.removeToken(refreshToken);
    return token;
  }

  private async setTokens(userDto: UserDto) {
    try {
      const tokens = this.tokenService.generateTokens(userDto);
      await this.tokenService.saveToken(userDto.id, tokens.refreshToken);

      return {
        ...tokens,
        user: userDto,
      };
    } catch (error) {
      throw new HttpException(
        'Ошибка при сохранении токена',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    const userData = this.tokenService.validateRefreshToken(refreshToken);
    const tokenFromDataBase = await this.tokenService.findToken(refreshToken);

    if (!userData || !tokenFromDataBase) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.getUsersById(userData.id);

    return await this.setTokens({
      email: user.email,
      id: user.id,
      isActivated: user.isActivated,
    });
  }

  private async validateUser(userDto: CreateUserDto) {
    const user = await this.userService.getUsersByEmail(userDto.email);
    if (user) {
      const passwordEquals = await bcrypt.compare(
        userDto.password,
        user.password,
      );

      if (passwordEquals) {
        return user;
      }
    }

    throw new HttpException(
      {
        status: HttpStatus.BAD_REQUEST, // Пользовательский код ошибки
        error: 'Некорректный email или пароль',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
