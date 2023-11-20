import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'mail@mail.ru', description: 'Email' })
  readonly email: string;
  @ApiProperty({ example: '123546', description: 'Пароль' })
  readonly password: string;
}
