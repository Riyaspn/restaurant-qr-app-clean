// pages/order/bills.js
const isNative = process.env.NATIVE_BUILD === '1';

if (isNative) {
  module.exports = require('../../page-variants/order/bills.native');
} else {
  const mod = require('../../page-variants/order/bills.web');
  module.exports = {
    ...mod,
    default: mod.default,
    getServerSideProps: mod.getServerSideProps,
  };
}
