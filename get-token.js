// get-token.js
const { GoogleAuth } = require('google-auth-library');

async function main() {
  const auth = new GoogleAuth({
    keyFile: 'service-account.json',
    scopes: 'https://www.googleapis.com/auth/firebase.messaging',
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  console.log(accessToken.token);
}

main().catch(console.error);
