

import Processor from "@prisma-cms/prisma-processor";

import shortid from "shortid";

import PrismaModule from "@prisma-cms/prisma-module";
import UploadModule from "@prisma-cms/upload-module";
import MailModule from "@prisma-cms/mail-module";
import SmsModule from "@prisma-cms/sms-module";
import LogModule from "@prisma-cms/log-module";

import isemail from "isemail";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import MergeSchema from 'merge-graphql-schemas';

import chalk from 'chalk';

import path from 'path';

import fs from 'fs';

import ResetPasswordModule from "./resetPassword";

import moment from "moment";

const moduleURL = new URL(import.meta.url);

const __dirname = path.dirname(moduleURL.pathname);

const { createWriteStream, unlinkSync } = fs;

const { fileLoader, mergeTypes } = MergeSchema

export const cleanUpPhone = function (phone) {

  if (phone) {

    const hasPlus = phone[0] === "+";

    phone = phone.trim().replace(/[\+\(\)\[\]\-\# ]/g, '');

    if (!phone) {
      phone = undefined;
    }
    else {

      if (!hasPlus) {

        if (phone.length === 10) {
          phone = '7' + phone;
        }

        // else if (phone.length === 11 && phone[0] === "8") {
        else if (phone[0] === "8") {
          phone = phone.replace(/^.{1}/, '7')
        }

      }
    }


  }

  return phone;
}


export const createPassword = async (password) => {

  if (!password) {
    throw (new Error("Пароль не может быть пустым"));
  }

  return await bcrypt.hash(password, 10);
}


export class UserProcessor extends Processor {


  constructor(ctx) {

    super(ctx);

    this.objectType = "User";

  }


  async createPassword(password) {
    return await createPassword(password);
  }


  async signin(args, info) {

    const {
      ctx,
    } = this;

    const {
      where,
      data: {
        password,
      },
    } = args;


    const {
      db,
    } = ctx;


    const user = await db.query.user({
      where,
    });


    if (!user) {
      this.addFieldError("username", "Пользователь не был найден");
    }
    else if (!user.password || !await bcrypt.compare(password, user.password)) {

      this.addFieldError("password", "Неверный пароль");
    }


    let token;

    if (!this.hasErrors()) {
      this.data = user;

      token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    }


    const result = this.prepareResponse();

    if (user) {
      db.mutation.updateUser({
        data: {
          LogedIns: {
            create: {},
          },
          activated: true,
        },
        where: {
          id: user.id,
        },
      });
    }

    return {
      ...result,
      token,
    }

  }


  async signup(args, info) {

    let {
      data: {
        username,
        fullname,
        email,
        password,
        ...data
      },
    } = args;

    const {
      ctx,
    } = this;

    const {
      db,
    } = ctx;

    let token;


    if (!password) {
      this.addFieldError("password", "Type password");
    }


    if (!username) {
      // this.addFieldError("username", "Укажите логин");
    }
    else if (isemail.validate(username)) {
      this.addFieldError("username", "Please, do not set email as username");
    }
    // Проверяем есть ли пользователь с таким ником
    else if (await db.query.user({
      where: {
        username,
      },
    })) {
      // throw ("Пользователь с таким логином уже зарегистрирован");
      this.addFieldError("username", "Username already exists");
    }

    // Проверяем есть ли пользователь с таким емейлом
    if (!email) {
      // this.addFieldError("email", "Укажите емейл");
    }
    else if (!isemail.validate(email)) {

      this.addFieldError("email", "Please, type correct email");

    }
    else if (await db.query.user({
      where: {
        email,
      },
    })) {
      // throw ("Пользователь с таким емейлом уже зарегистрирован");
      this.addFieldError("email", "Email already exists");
    }


    if (!this.hasErrors()) {

      password = await this.createPassword(password);

      await this.mutate("createUser", {
        data: {
          ...data,
          username,
          fullname,
          email,
          password,
          active: true,
          activated: true,
          LogedIns: {
            create: {},
          },
        },
      })
        .then(user => {

          this.data = user;

          const {
            id: userId,
          } = user || {}

          if (userId) {
            token = jwt.sign({
              userId,
            }, process.env.APP_SECRET)
          }

          return user;
        })
        .catch(e => {
          console.error("signup error", e);
          return e;
        });

    }


    const result = this.prepareResponse();

    return {
      ...result,
      token,
    }

  }


  async create(objectType, args, info) {


    const {
      db,
    } = this.ctx;

    let {
      data: {
        sudo,
        username,
        password,
        email,
        fullname,
        ...data
      },
    } = args;


    const currentUser = await this.getUser();

    if (!currentUser) {
      throw (new Error("Необходимо авторизоваться"));
    }

    const {
      id: currentUserId,
    } = currentUser;

    data.CreatedBy = {
      connect: {
        id: currentUserId,
      },
    }


    if (!fullname) {
      this.addFieldError("fullname", "Укажите ФИО");
    }


    if (password === undefined) {
      password = await createPassword(await shortid.generate());
    }
    else if (!password) {
      this.addFieldError("password", "Пароль не может быть пустым");
    }

    if (username !== undefined) {
      if (!username) {
        this.addFieldError("username", "Укажите логин");
      }
      else if (isemail.validate(username)) {
        this.addFieldError("username", "Не указывайте емейл в качестве логина, заспамят.");
      }
      // Проверяем есть ли пользователь с таким ником
      else if (await db.query.user({
        where: {
          username,
        },
      })) {
        // throw ("Пользователь с таким логином уже зарегистрирован");
        this.addFieldError("username", "Пользователь с таким логином уже зарегистрирован");
      }
    }

    // Проверяем есть ли пользователь с таким емейлом
    if (email) {
      // this.addFieldError("email", "Укажите емейл");

      if (!isemail.validate(email)) {

        this.addFieldError("email", "Укажите корректный емейл");

      }
      else if (await db.query.user({
        where: {
          email,
        },
      })) {
        // throw ("Пользователь с таким емейлом уже зарегистрирован");
        this.addFieldError("email", "Пользователь с таким емейлом уже зарегистрирован");
      }

    }




    data.password = password;

    args.data = {
      ...data,
      username,
      password,
      email,
      fullname,
    };

    return super.create(objectType, args, info);
  }


  async update(objectType, args, info) {

    // const userId = await getUserId(this.ctx);

    let {
      data: {
        password,
        sudo,
        Groups,
        birthday,
        ...data
      },
      where = {},
      id,
    } = args;


    if (password !== undefined) {

      if (password) {
        password = await createPassword(password);
      }
      else {
        password = undefined;
      }

    }



    const {
      db,
    } = this.ctx;


    if (id) {
      where = {
        id,
      }
    }


    const currentUser = await this.getUser();


    if (!this.hasErrors()) {

      let user;

      if (Object.keys(where).length) {
        user = await this.query("user", {
          where,
        });
      }
      else {
        user = currentUser;
      }

      if (!user) {
        this.addError("Не был получен пользователь");
      }
      else {

        if (currentUser.sudo === true) {

          Object.assign(data, {
            sudo,
            Groups,
          });

        }
        else {

          /**
           * Если обновляемый пользователь не текущий, то проверяем права это делать
           */
          if (user.id !== currentUser.id) {

            this.addError("Нет прав");

          }

        }




        return super.update(objectType,
          {
            where: {
              id: user.id,
            },
            data: {
              ...data,
              password,
            },
          },
          // info,
        );
      }

    }


    // return this.prepareResponse();
  }


  async mutate(method, args, info) {

    // return super.mutate(method, args, info);

    let {
      data: {
        phone,
        email,
        ...data
      },
      ...otherArgs
    } = args;


    if (phone) {
      phone = cleanUpPhone(phone);
    }

    if (email !== undefined) {
      email = email && email.trim("").toLowerCase() || null;
    }

    data = {
      ...data,
      phone,
      email,
    }

    return super.mutate(method, {
      data,
      ...otherArgs
    });

  }


  async resetPasswordWithResponse(args, info) {

    let {
      where,
      data: {
        code,
        ...data
      },
      ...otherArgs
    } = args;


    /**
     * Проверяем код
     */
    const resetPassword = await this.getResetPasswordCode(args, info);


    /**
     * Если код был получен, сбрасываем пароль пользователя
     */
    if (resetPassword) {

      const updatedUser = await this.resetPassword(resetPassword);

      const {
        password,
      } = resetPassword;

      /**
       * Если пользователь был обновлен, авторизовываем пользователя
       */
      if (updatedUser) {

        const {
          id: userId,
        } = updatedUser;

        return await this.signin({
          where: {
            id: userId,
          },
          data: {
            password,
          },
        });

      }

    }

    return this.prepareResponse();
  }


  async getResetPasswordCode(args, info) {


    let {
      where,
      data: {
        code,
        ...data
      },
      ...otherArgs
    } = args;

    const {
      ctx: {
        db,
      },
    } = this;


    if (!code) {
      this.addFieldError("code", "Не указан код");
    }
    else {

      const query = `{
        id,
        code,
        password,
        validTill,
        User {
          id
        }
      }`;


      let passwordReset;

      let passwordResets = await db.query.resetPasswords({
        where: {
          User: where,
          code,
        },
        first: 1,
      }, query);

      passwordReset = passwordResets[0];


      if (!passwordReset) {
        this.addFieldError("code", "Неправильный код");
      }
      else {

        const {
          id: passwordResetId,
          code: passwordResetCode,
          password,
          validTill,
          User: {
            id: userId,
          }
        } = passwordReset;


        /**
         * Проверяем срок действия пароля
         */

        // console.log(chalk.green("validTill"), moment(validTill).format(), moment().format(), moment(validTill) < moment());

        if (!validTill || moment(validTill) < moment()) {
          this.addFieldError("code", "закончился срок действия кода");

          /**
           * Удаляем старый код
           */
          await db.mutation.deleteResetPassword({
            where: {
              id: passwordResetId,
            },
          })
            .catch(console.error)

        }

        else if (passwordResetCode !== code) {
          this.addFieldError("code", "Неправильный код");
        }
        else {

          /**
           * Если все проверки пройдены, сбрасываем пароль и авторизуем пользователя
           */
          return passwordReset;
        }

      }

    }

    return null;

  }


  async resetPassword(passwordReset) {

    const {
      id: passwordResetId,
      code: passwordResetCode,
      password,
      validTill,
      User: {
        id: userId,
      }
    } = passwordReset;

    const {
      db,
    } = this.ctx;


    const updatedUser = await db.mutation.updateUser({
      where: {
        id: userId,
      },
      data: {
        password: await this.createPassword(password),
      },
    });


    /**
     * Если пользователь был обновлен, удаляем запись сброса пароля.
     * Ошибку специально не обрабатываем, чтобы пользователь не был автоматически обновлен 
     * и запросил новый пароль.
     */
    await db.mutation.deleteManyResetPasswords({
      where: {
        // id: passwordResetId,
        User: {
          id: userId,
        },
      },
    });

    return updatedUser;

  }

}

export {
  UserProcessor as UserPayload,
}





export default class PrismaUserModule extends PrismaModule {


  constructor(options) {

    super(options);

    this.mergeModules([
      UploadModule,
      ResetPasswordModule,
      MailModule,
      SmsModule,
      LogModule,
    ]);


    this.userPayloadData = {
      data: (source, args, ctx, info) => {

        const {
          id,
        } = source.data || {};

        return id ? ctx.db.query.user({
          where: {
            id,
          },
        }, info) : null;
      }
    }

    this.resetCodeQueue = {}

  }


  cleanUpPhone(phone) {

    return cleanUpPhone(phone);
  }


  getSchema(types = []) {


    let schema = fileLoader(__dirname + '/schema/database/', {
      recursive: true,
    });


    if (schema) {
      types = types.concat(schema);
    }


    let typesArray = super.getSchema(types);

    return typesArray;

  }


  getApiSchema(types = []) {


    let baseSchema = [];

    let schemaFile = __dirname + "/../schema/generated/prisma.graphql";

    if (fs.existsSync(schemaFile)) {
      baseSchema = fs.readFileSync(schemaFile, "utf-8");
    }

    let apiSchema = super.getApiSchema(types.concat(baseSchema), []);

    let schema = fileLoader(__dirname + '/schema/api/', {
      recursive: true,
    });

    apiSchema = mergeTypes([apiSchema.concat(schema)], { all: true });


    return apiSchema;

  }


  getResolvers() {


    const resolvers = super.getResolvers();


    const {
      Query,
      Mutation,
      Subscription,
      ...other
    } = resolvers || {}


    return {
      Query: {
        ...Query,
        users: this.users.bind(this),
        usersConnection: this.usersConnection.bind(this),
        user: this.user.bind(this),
        me: this.me.bind(this),
        userGroups: this.userGroups.bind(this),
      },
      Mutation: {
        ...Mutation,
        signin: this.signin.bind(this),
        signup: this.signup.bind(this),
        // createUserProcessor: this.createUserProcessor.bind(this),
        updateUserProcessor: this.updateUserProcessor.bind(this),
        resetPasswordProcessor: this.resetPasswordProcessor.bind(this),
      },
      Subscription: {
        user: {
          subscribe: (source, args, ctx, info) => {
            return ctx.db.subscription.user(args, info);
          },
        },
      },
      ...other,
      UserResponse: this.userPayloadData,
      AuthPayload: this.userPayloadData,
      User: this.getUserResolvers(),
    };
  }


  getProcessor(ctx) {
    return new (this.getProcessorClass())(ctx);
  }

  getProcessorClass() {
    return UserProcessor;
  }



  async signup(source, args, ctx, info) {

    return this.getProcessor(ctx).signup(args, info);
  }

  async signin(source, args, ctx, info) {

    return this.getProcessor(ctx).signin(args, info);
  }

  async updateUserProcessor(source, args, ctx, info) {

    return this.getProcessor(ctx).updateWithResponse("User", args, info);
  }


  async createUserProcessor(source, args, ctx, info) {

    return this.getProcessor(ctx).createWithResponse("User", args, info);
  }


  resetPasswordProcessor(source, args, ctx, info) {


    const {
      where: {
        id: userId,
      },
    } = args;


    if (!userId) {
      throw new Error("userId is empty");
    }


    /**
     * Проверка, чтобы на одного пользователя не сыпалось 100500 запросов на смену пользователя.
     * Защита от перебора
     */
    if (this.resetCodeQueue[userId]) {
      throw new Error("Already in progress");
    }

    this.resetCodeQueue[userId] = true;

    // return;

    return new Promise((resolve, reject) => {

      setTimeout(() => {

        this.getProcessor(ctx).resetPasswordWithResponse(args, info)
          .then(resolve)
          .catch(reject);

        delete this.resetCodeQueue[userId];

      }, 3000);

    });

  }



  prepareWhere(source, argsWhere, ctx, info) {

    const {
      currentUser,
    } = ctx;

    const {
      sudo,
    } = currentUser || {};

    // Очищаем все аргументы
    info.fieldNodes.map(n => {
      n.arguments = []
    });

    let {
      search,
      showHidden,
      ...otherWhere
    } = argsWhere || {}

    // console.log(chalk.green("otherWhere"), otherWhere);

    let where = {};


    let AND = [];

    if (otherWhere && Object.keys(otherWhere).length) {
      AND.push(otherWhere);
    }

    if (!sudo && !showHidden) {
      AND.push({
        OR: [
          {
            hidden: null
          },
          {
            hidden: false
          },
        ],
      });
    }

    if (search) {

      const searchWhere = this.prepareSearch(search);

      if (searchWhere) {
        AND.push(searchWhere)
      }
    }


    if (AND.length) {
      where.AND = AND;
    }

    // console.log(chalk.green("where AND"), AND);

    // AND.map(n => {
    //   console.log(chalk.green("where AND n "), n);
    // });

    return where;

  }

  prepareSearch(search) {

    search = search ? search.trim() : null;

    if (search) {


      let OR = [];

      let phone = this.cleanUpPhone(search);

      if (phone) {
        OR.push({
          phone_contains: phone,
        });
      }

      OR.push({
        id: search,
      });

      OR.push({
        username_contains: search,
      });

      OR.push({
        fullname_contains: search,
      });

      OR.push({
        email_contains: search,
      });


      return {
        OR,
      }
    }

  }


  usersConnection(source, args, ctx, info) {

    let {
      where: argsWhere,
    } = args


    const where = this.prepareWhere(source, argsWhere, ctx, info);

    console.log(chalk.green("where"), where);

    Object.assign(args, {
      where,
      // where: {
      //   ...where,
      //   phone,
      //   OR,
      // },
    });



    return ctx.db.query.usersConnection(args, info);

  }


  users(source, args, ctx, info) {


    let {
      where: argsWhere,
    } = args


    const where = this.prepareWhere(source, argsWhere, ctx, info);


    Object.assign(args, {
      where,
      // where: {
      //   ...where,
      //   phone,
      //   OR,
      // },
    });

    return ctx.db.query.users(args, info);

  }

  user(source, args, ctx, info) {


    return ctx.db.query.user(args, info);
  }


  me(source, args, ctx, info) {

    const {
      currentUser,
      db,
    } = ctx;

    const {
      id: currentUserId,
    } = currentUser || {};

    return currentUserId ? db.query.user({
      where: {
        id: currentUserId,
      }
    }, info) : null;
  }





  getUserResolvers() {

    return {

      LogedIns: (source, args, ctx, info) => {


        const {
          LogedIns,
        } = source;

        const {
          sudo,
        } = ctx.currentUser || {};


        return sudo ? LogedIns : [];

      },

      email: (source, args, ctx, info) => {

        const {
          id,
          email,
          showEmail,
        } = source;

        const {
          id: currentUserId,
          sudo,
        } = ctx.currentUser || {};

        return (id === currentUserId) || showEmail || sudo ? email : null;

      },

      phone: (source, args, ctx, info) => {

        const {
          id,
          phone,
          showPhone,
        } = source;

        const {
          id: currentUserId,
          sudo,
        } = ctx.currentUser || {};

        return id === currentUserId || showPhone || sudo ? phone : null;

      },

      hasEmail: (source, args, ctx, info) => {

        const {
          email,
        } = source;

        return email ? true : false;

      },

      hasPhone: (source, args, ctx, info) => {

        const {
          phone,
        } = source;

        return phone ? true : false;

      },

      password: () => null,
    }
  }


  userGroups(source, args, ctx, info) {

    const {
      currentUser,
    } = ctx;


    const {
      sudo,
    } = currentUser || {};

    return sudo ? ctx.db.query.userGroups({}, info) : [];

  }


}



