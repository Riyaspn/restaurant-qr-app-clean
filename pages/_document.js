
// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">

      <Head>
        <link rel="manifest" href="/manifest.json" />
        {/* other head tags */}
      </Head>

      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>

  );
  )
}
