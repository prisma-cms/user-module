
import startServer from "@prisma-cms/server";

import PrismaUserModule from "../";


const module = new PrismaUserModule({
});

const resolvers = module.getResolvers();


startServer({
  typeDefs: 'src/schema/generated/api.graphql',
  resolvers,
});
