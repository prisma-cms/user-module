
module.exports = {
  type: 'web-module',
  npm: {
    esModules: true,
    umd: false
  },
  babel: {
    "presets": [
      "es2015",
      "stage-0",
      "react"
    ],
    "plugins": [
      "transform-runtime",
      "transform-class-properties",
    ],
  },
  // webpack: {
  //   extra: {
  //     module: {
  //       rules: [
  //         {
  //           test: /\.node$/,
  //           loader: 'node-loader',
  //         }
  //       ],
  //     },
  //   },
  // },
}
