import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/users.model';
import { InjectModel } from '@nestjs/sequelize';
import { Token } from './token.model';
import { UserDto } from '../users/dto/user.dto';

@Injectable()
export class TokenService {
  constructor(
    @InjectModel(Token) private tokenRepository: typeof Token,
    private jwtService: JwtService,
  ) {}

  generateTokens(userDto: UserDto) {
    const accessToken = this.jwtService.sign(userDto, { expiresIn: '1h' });

    const refreshToken = this.jwtService.sign(userDto, { expiresIn: '30d' });

    return { accessToken, refreshToken };
  }

  async saveToken(userId: number, refreshToken: string) {
    const tokenData = await this.tokenRepository.findOne({ where: { userId } });

    if (tokenData) {
      const updatedToken = await tokenData.update({ refreshToken });
      return updatedToken;
    }
    const token = await this.tokenRepository.create({
      userId: userId,
      refreshToken,
    });

    return token;
  }

  async removeToken(refreshToken: string) {
    const tokenData = await this.tokenRepository.destroy({
      where: { refreshToken },
    });

    return tokenData;
  }
}
