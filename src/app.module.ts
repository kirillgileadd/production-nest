import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { User } from './users/users.model';
import { RolesModule } from './roles/roles.module';
import { Role } from './roles/roles.model';
import { UserRoles } from './roles/user-roles.model';
import { AuthModule } from './auth/auth.module';
import { TokenModule } from './token/token.module';
import { Token } from './token/token.model';
import { MailModule } from './mail/mail.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { Sequelize } from 'sequelize-typescript';

@Module({
  controllers: [],
  providers: [],
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.${process.env.NODE_ENV}.env`,
    }),
    SequelizeModule.forRoot({
      models: [Role, UserRoles, Token, User],
      dialect: 'postgres',
      autoLoadModels: true,
      host: process.env.POSTRGRES_HOST,
      database: process.env.POSTRGRES_DB,
      username: process.env.POSTRGRES_USER,
      port: Number(process.env.POSTRGRES_PORT),
      password: process.env.POSTRGRES_PASSWORD,
    }),
    SequelizeModule.forFeature([Role, UserRoles, Token, User]),
    AuthModule,
    TokenModule,
    UsersModule,
    RolesModule,
    MailModule,
    MailerModule,
  ],
})
export class AppModule {
  constructor(private readonly sequelize: Sequelize) {
    // Здесь вы можете вызвать метод sync
    sequelize.sync({ force: false, alter: true }).then(() => {
      console.log('Таблицы синхронизированы');
    });
  }
}
