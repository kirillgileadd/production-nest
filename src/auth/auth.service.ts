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
import { v4 as uuidv4 } from 'uuid';
import { ResetPasswordDto } from '../users/dto/reset-password-dto';

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
      roles: user.roles,
    });
  }

  async registration(createUserDto: CreateUserDto) {
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
      roles: user.roles,
    });

    throw new HttpException(
      'Ошибка при регистрации пользователя',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
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
      console.log(error);
      throw new HttpException(
        'Ошибка при сохранении токена',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async forgotPassword(email: string) {
    const forgotPasswordLink = uuidv4();
    const user = await this.userService.getUsersByEmail(email);

    if (user) {
      await this.mailService.sendForgotPasswordMail(
        user.email,
        `${process.env.APP_URL}/reset-password/${forgotPasswordLink}`,
      );
      await user.update({ forgotPasswordLink });

      return user;
    }

    return null;
  }

  async resetPassword(userDto: ResetPasswordDto) {
    const user = await this.userService.getUserByForgotPasswordLink(
      userDto.token,
    );
    const hashPassword = await bcrypt.hash(userDto.password, 5);
    if (user) {
      await user.update({ password: hashPassword });
      return user;
    }

    throw new HttpException(
      {
        status: HttpStatus.BAD_REQUEST, // Пользовательский код ошибки
        error: 'Некорректный token для смены пароля',
      },
      HttpStatus.BAD_REQUEST,
    );
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
      roles: user.roles,
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
