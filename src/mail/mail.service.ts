import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendActivationMail(emailTo: string, link: string) {
    await this.mailerService.sendMail({
      to: emailTo, // list of receivers
      from: process.env.SMTP_USERNAME, // sender address
      subject: 'Активашия аккаутна ✔' + process.env.API_URL, // Subject line
      text: '', // plaintext body
      html: `<div><h1>Для активации перейдите по ссылке</h1> <a href="${link}">${link}</a></div>`, // HTML body content
    });
  }
}
