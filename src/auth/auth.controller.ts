import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { ForgotPassUserDto } from '../users/dto/forgot-pass-user.dto';
import { ResetPasswordDto } from '../users/dto/reset-password-dto';

@ApiTags('Авторизация')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/login')
  async login(
    @Body() userDto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userData = await this.authService.login(userDto);
    res.cookie('refresh_token', userData.refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return this.authService.login(userDto);
  }

  @Post('/registration')
  async registration(
    @Body() userDto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userData = await this.authService.registration(userDto);
    res.cookie('refresh_token', userData.refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return userData;
  }

  @Post('/logout')
  async logout(@Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const { refresh_token } = req.cookies;

    if (!refresh_token) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST, // Пустая кука
          error: 'В куке нет refresh_token',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.authService.logout(refresh_token);
    res.clearCookie('refresh_token');

    return HttpStatus.OK;
  }

  @Get('/activate/:activationLink')
  async activate(
    @Param('activationLink') activationLink,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.activate(activationLink);
    return res.redirect(process.env.APP_URL);
  }

  @Get('/refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { refresh_token } = req.cookies;
      const userData = await this.authService.refresh(refresh_token);
      res.cookie('refresh_token', userData.refreshToken, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      return userData;
    } catch (error) {
      return HttpStatus.BAD_REQUEST;
    }
  }

  @Post('/forgot-password')
  async forgotPassword(
    @Body() userDto: ForgotPassUserDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userData = await this.authService.forgotPassword(userDto.email);
    return userData;
  }

  @Post('/reset-password')
  async resetPassword(@Body() userDto: ResetPasswordDto) {
    const userData = await this.authService.resetPassword(userDto);
    return userData;
  }
}
