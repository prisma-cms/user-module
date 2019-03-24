

import PrismaProcessor from "@prisma-cms/prisma-processor";
import PrismaModule from "@prisma-cms/prisma-module";

import chalk from "chalk";

import passwordGenerator from "generate-password";

import {
  SmsMessageProcessor,
} from "@prisma-cms/sms-module";

import moment from "moment";

class ResetPasswordProcessor extends PrismaProcessor {


  constructor(props) {

    super(props);

    this.objectType = "ResetPassword";

    this.private = false;

    this.allowSendResetPasswordCodeViaSms = true;

  }


  async create(objectType, args, info) {

    const {
      ctx,
    } = this;


    const {
      db,
    } = ctx;

    let {
      data: {
        code,
        password,
        User,
        validTill,
        ...data
      },
      ...otherArgs
    } = args;


    validTill = moment().add(1, "H");


    code = code ? code : passwordGenerator.generate({
      length: 6,
      uppercase: false,
      numbers: true,
    });

    password = password ? password : passwordGenerator.generate({
      length: 6,
      numbers: true,
      uppercase: false,
      symbols: false,
    });


    if (!User || !User.connect) {
      return this.addError("Не указан пользователь");
    }

    const user = await db.query.user({
      where: User.connect,
    })
      .catch(console.error);


    if (!user) {
      return this.addError("Не был получен пользователь");
    }


    Object.assign(data, {
      code,
      password,
      User,
      validTill,
    });


    const result = await super.create(objectType, {
      data,
      ...otherArgs,
    }, info);


    /**
     * Если был создан код, надо его отправить пользователю
     */
    if (result) {

      const {
        id: resetPasswordId,
      } = result;

      const sends = await this.sendResetPasswordCode(result, user);

      /**
       * Если данные не были отправлены никаким образом,
       * удаляем запись и возвращаем ошибку
       */
      if (!sends.length) {

        await db.mutation.deleteResetPassword({
          where: {
            id: resetPasswordId,
          },
        })
          .catch(console.error);

        this.addError("Не удалось отправить код. Попробуйте еще раз.");

      }

    }

    return result;
  }


  async mutate(objectType, args, into) {

    return super.mutate(objectType, args);
  }


  async sendResetPasswordCode(resetPassword, user) {

    let sends = [];


    const sendedViaEmail = await this.sendResetPasswordCodeViaEmail(resetPassword, user);

    if (sendedViaEmail) {
      sends.push("email");
    }

    const sendedViaSms = await this.sendResetPasswordCodeViaSms(resetPassword, user);

    if (sendedViaSms) {
      sends.push("sms");
    }

    // console.log("sends");

    return sends;
  }


  async sendResetPasswordCodeViaEmail(resetPassword, user) {

    const {
      ctx: {
        db,
      },
    } = this;


    let result;

    const {
      id: userId,
      email,
    } = user;

    if (email) {

      const {
        code,
      } = resetPassword;


      // Создаем новое сообщение
      result = await db.mutation.createLetter({
        data: {
          email,
          subject: "Код для сброса пароля",
          message: `<h3>Кем-то был запрошен сброс пароля.</h3>
          <p>
            <strong>
              Внимание! Если это были не вы, ничего не делайте. Никому не сообщайте эти данные.
            </strong>
          </p>
          <p>
            ID пользователя: ${userId}
          </p>
          <p>
            Емейл: ${email}
          </p>
          <p>
            Код для сброса: ${code}
          </p>
        `,
        },
      })
        .catch(console.error);

    }

    return result;

  }


  async sendResetPasswordCodeViaSms(resetPassword, user) {

    const {
      ctx,
      allowSendResetPasswordCodeViaSms,
    } = this;

    const {
      db,
    } = ctx;


    let result;

    if (allowSendResetPasswordCodeViaSms) {


      const {
        id: userId,
        phone,
      } = user;


      if (phone) {

        const {
          code,
        } = resetPassword;


        const smsProcessor = new SmsMessageProcessor(ctx);

        let smsArgs = {
          data: {
            from: "mamba.zone",
            text: `Код для сброса пароля: ${code}`,
            recipients: {
              set: [phone],
            },
            Provider: {
              connect: {
                name: "LetsAds",
              },
            }
          },
        }

        result = await smsProcessor.createAndSendSms("SmsMessage", smsArgs)
          .catch(console.error);


      }



    }


    return result;

  }

}




class Module extends PrismaModule {


  constructor(props = {}) {

    super(props);

    // this.mergeModules([ 
    // ]);


    this.ResetPasswordResponse = {
      data: (source, args, ctx, info) => {

        const {
          id,
        } = source && source.data || {};

        return id ? ctx.db.query.resetPassword({
          where: {
            id,
          },
        }, info) : null;

      },
    }

  }



  getResolvers() {


    return {
      Query: {
        // resetPassword: this.resetPassword.bind(this),
        // resetPasswords: this.resetPasswords.bind(this),
        // resetPasswordsConnection: this.resetPasswordsConnection.bind(this),
      },
      Mutation: {
        createResetPasswordProcessor: this.createResetPasswordProcessor.bind(this),
        // updateResetPasswordProcessor: this.updateResetPasswordProcessor.bind(this),
        // deleteResetPassword: this.deleteResetPassword.bind(this),
        // deleteManyResetPasswords: this.deleteManyResetPasswords.bind(this),
      },
      Subscription: {
        // resetPassword: {
        //   subscribe: async (parent, args, ctx, info) => {

        //     return ctx.db.subscription.resetPassword(args, info)
        //   },
        // },
      },
      ResetPasswordResponse: this.ResetPasswordResponse,
      ResetPassword: {
        code: () => null,
        password: () => null,
        User: () => null,
      },
    }

  }


  getProcessor(ctx) {
    return new (this.getProcessorClass())(ctx);
  }

  getProcessorClass() {
    return ResetPasswordProcessor;
  }


  resetPasswords(source, args, ctx, info) {
    return ctx.db.query.resetPasswords({}, info);
  }

  resetPassword(source, args, ctx, info) {
    return ctx.db.query.resetPassword({}, info);
  }

  resetPasswordsConnection(source, args, ctx, info) {
    return ctx.db.query.resetPasswordsConnection({}, info);
  }


  createResetPasswordProcessor(source, args, ctx, info) {

    return this.getProcessor(ctx).createWithResponse("ResetPassword", args, info);
  }

  updateResetPasswordProcessor(source, args, ctx, info) {

    return this.getProcessor(ctx).updateWithResponse("ResetPassword", args, info);
  }


  deleteResetPassword(source, args, ctx, info) {
    return ctx.db.mutation.deleteResetPassword({}, info);
  }


  deleteManyResetPasswords(source, args, ctx, info) {
    return ctx.db.mutation.deleteManyResetPasswords({}, info);
  }

}


export default Module;
