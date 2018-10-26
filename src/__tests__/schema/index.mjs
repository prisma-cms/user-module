
import expect from 'expect'

import chalk from "chalk";

import module from "../module";

const { parse } = require('graphql');

/**
 */

const requiredTypes = [
  // {
  //   name: "Query",
  //   fields: {
  //     both: [
  //     ],
  //     prisma: [
  //     ],
  //     api: [
  //     ],
  //   },
  // },
  {
    name: "User",
    fields: {
      both: [
      ],
      prisma: [
        "id",
        "username",
        "fullname",
      ],
      api: [
      ],
    },
  },
]


// describe('Get prisma Schema', () => {

//   it('', () => {

//     console.log("module", module.getSchema());

//   });

// })


describe('Get prisma Schema', () => {


  const schema = module.getSchema();

  const ast = parse(schema);

  const {
    definitions,
  } = ast;


  const types = definitions.filter(n => n.kind === "ObjectTypeDefinition");


  // types.map(type => {

  //   const {
  //     name: {
  //       value: name,
  //     },
  //     fields,
  //   } = type;

  //   console.log(chalk.bgGreen.black("Type name"), name);

  //   fields.map(field => {

  //     const {
  //       name: {
  //         value: fieldName,
  //       },
  //     } = field;

  //     console.log(chalk.bgWhite.blue("Type filed name"), fieldName);

  //   });

  // });


  requiredTypes.map(type => {

    // const type = requiredTypes[name];

    const {
      name,
      fields: typeFields,
    } = type;


    const {
      both = [],
      prisma = [],
    } = typeFields;

    let requiredFields = [...new Set(both.concat(prisma))]


    if (!requiredFields.length) {
      return;
    }


    it(`Try to find type ${name}`, () => {


      // console.log(chalk.green("required Type"), type);

      // console.log(chalk.green(`Try to find type ${name}`));
      const definition = definitions.find(n => n.kind === "ObjectTypeDefinition" && n.name.value === name);

      // console.log(chalk.green("definition"), definition);

      expect(typeof definition === "object").toBe(true);

      requiredFields.map(fieldName => {

        // console.log(chalk.green("field 0"), definition.fields[0].name.value);

        // console.log(chalk.green(`Try to find field ${name}:${fieldName}`));
        const field = definition.fields.find(n => n.kind === "FieldDefinition" && n.name.value === fieldName);

        // console.log(chalk.green("field"), field);

        try {
          expect(typeof field === "object").toBe(true);
        }
        catch (error) {
          throw (`Can not find field ${name}:${fieldName}`);
        }


      })

    })

  });


});


describe('Get API Schema', () => {



  const schema = module.getApiSchema();

  const ast = parse(schema);

  const {
    definitions,
  } = ast;


  const types = definitions.filter(n => n.kind === "ObjectTypeDefinition");


  // types.map(type => {

  //   const {
  //     name: {
  //       value: name,
  //     },
  //     fields,
  //   } = type;

  //   // console.log(chalk.green("Type"), name);
  //   console.log(chalk.bgGreen.black("Type name"), name);

  //   fields.map(field => {

  //     const {
  //       name: {
  //         value: fieldName,
  //       },
  //     } = field;

  //     console.log(chalk.bgWhite.blue("Type filed name"), fieldName);

  //   });

  // });



  requiredTypes.map(type => {

    // const type = requiredTypes[name];

    const {
      name,
      fields: typeFields,
    } = type;


    const {
      both = [],
      api = [],
    } = typeFields;

    let requiredFields = [...new Set(both.concat(api))]


    if (!requiredFields.length) {
      return;
    }


    it(`Try to find type ${name}`, () => {


      // console.log(chalk.green("required Type"), type);

      // console.log(chalk.green(`Try to find type ${name}`));
      const definition = definitions.find(n => n.kind === "ObjectTypeDefinition" && n.name.value === name);

      // console.log(chalk.green("definition"), definition);

      expect(typeof definition === "object").toBe(true);

      requiredFields.map(fieldName => {


        // console.log(chalk.green("field 0"), definition.fields[0].name.value);

        // console.log(chalk.green(`Try to find field ${name}:${fieldName}`));
        const field = definition.fields.find(n => n.kind === "FieldDefinition" && n.name.value === fieldName);

        // console.log(chalk.green("field"), field);

        try {
          expect(typeof field === "object").toBe(true);
        }
        catch (error) {
          throw (`Can not find field ${name}:${fieldName}`);
        }

      })

    })

  });



})
