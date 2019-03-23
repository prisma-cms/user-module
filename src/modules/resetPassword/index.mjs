

import PrismaProcessor from "@prisma-cms/prisma-processor";
import PrismaModule from "@prisma-cms/prisma-module";

import chalk from "chalk";

import passwordGenerator from "generate-password";

class ResetPasswordProcessor extends PrismaProcessor {


  constructor(props) {

    super(props);

    this.objectType = "ResetPassword";

    this.private = false;

  }


  async create(objectType, args, info) {


    let {
      data: {
        code,
        password,
        ...data
      },
      ...otherArgs
    } = args;


    code = code ? code : passwordGenerator.generate({
      length: 8,
      numbers: true,
    });

    password = password ? password : passwordGenerator.generate({
      length: 8,
      numbers: true,
      uppercase: false,
      symbols: false,
    });

    Object.assign(data, {
      code,
      password,
    });

    return super.create(objectType, {
      data,
      ...otherArgs,
    }, info);

  }


  async mutate(objectType, args, into) {

    return super.mutate(objectType, args);
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
