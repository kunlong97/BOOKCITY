// 前四个插件原先来自 @taoyage/configs/postcss，现在直接写在这里
module.exports = {
  plugins: [
    require('postcss-image-set-polyfill'),
    require('postcss-flexbugs-fixes'),
    require('postcss-preset-env')({
      autoprefixer: {
        flexbox: 'no-2009',
      },
      browsers: 'last 2 versions',
      stage: 3,
    }),
    require('postcss-normalize'),
    require('postcss-pxtorem')({ rootValue: 37.5, propList: ['*'], selectorBlackList: ['html'] }),
  ],
};
