// pages/restaurants/[id].js
const isNative = process.env.NATIVE_BUILD === '1';

if (isNative) {
  module.exports = require('../../page-variants/restaurants/[id].native');
} else {
  const mod = require('../../page-variants/restaurants/[id].web');
  module.exports = {
    ...mod,
    default: mod.default,
    getServerSideProps: mod.getServerSideProps,
  };
}
