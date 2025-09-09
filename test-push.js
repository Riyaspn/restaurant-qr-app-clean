// test-push.js
const admin = require('firebase-admin');

// Your Firebase service account credentials
const serviceAccount = {
  type: "service_account",
  project_id: "cafe-qr-notifications",
  private_key_id: "c39d0ab7ddc3f42591bae1d3b101aa97a1958f29",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCYcgz7fQq+imrL\nNsI+dWeM4UzOPmH8t/JE31LdgC3sX0V78Zv7YA1e+XhX8DDGYZ/g9td1UhR90fzB\n4h9k+cjRxZN7mSxG5xBUA9Rf0pnP1v3RCY3Yyy73T3aKh0HAH39gK+Cx5I+kTC+8\n0B7DdUR98+PGWo/eXNzQd2Pao7u7vUlmjYksU1Vusetx0kh2C90YkRUGNXFvb5LI\nfLo+bQvGDNUCBipjw3FkA+HKpb9WYxOQ9pzAqR2PJVRPpDMSSgJ7h9PrQJade680\nNOCOo0eIXZBGcmhWwVozKfcHYdDIUX5SZa2D0pz/VZS3w8cl1Fos7sldKUWN9wtV\nwsUgy21zAgMBAAECggEADzLfxHsVBSY7u4L8HsoJxuv3gmCJ2G5mgyNY2aib64Mc\nJF1UVd2ft6ZbrzjNRBobnIw/svy5+kljT9lBlAmrUe7G433EAlWrNRUkqWEP4L7o\nk1zGfaTUS+fqQ6l0jrkVM/tr7ZCCGblW0RZW2tnoOD6GqRICYgMUKNyeYgANCYyQ\nKSZjdblDHwCWCosjmrzdyWzFrcEzmJMlVqZuB2Fr/No9ARnLPQMUmqb3ml4h3V9s\nA8y8SkDpZiADCj7Mmtl0UmYI39s+bTo06GnouRluGy23YuMy47A65Jpmx73LrKEW\n6oMVU4b95W1LZ2ijPlf9DiJtWQ6JogUWt8Vi2AysYQKBgQDXUGIJWcsu0T/H1pYH\nJ/SS7o6rpgqyLc9XGUf3KEDMLZrxkgGSKsFVJS0iMIYOUXj1OpQ5rLLqkjAktKOq\nvnn0KlO6CTULXfKDxn4fuVd/C87d2Z0cuN9wagW/212IKbPeXk7BzCQt1BX7vx7V\nV3BPd4EPIp+q4s4eWgqDXCHMuwKBgQC1QHZjD2OGH+z3NfLnqrF6+HbjhGmx8auZ\nQOKdZzfKwD4ZN82StLmkmejC10EkTiFOtzUDcNlMVf8/qLikyR1FuRgTsmXhlOw1\n54fZjiPFzGmcYesWiF4/Ki2QfvoKnuY0EXlswF3nRwTzwx+NJ4P1J7Jj+akT3mDs\nerx21vByqQKBgQCNUGeXpYRyLMnEmfULq1Cc4s9mnuqkOOa9To1qDNRCbagk5mP7\nj+4luOmfZ+OEIDrYEGNaWxtuUxYf8SL+HFekRed/0S0sUbOqgysiHR3s904FUx8H\ny9pySFOPsST5Cg3QY2sjTJ1uKqVm/e/5q5K9xTxCN8I9gPAxAX2m62APowKBgBxw\nZ+L1KC2EVt8XFOzqqHxd/fGG9jqYa89ZEfWWm3dxoIy+Z8AMIVDFYXMo6Sy0IZ/D\nOUs36rCCkdFAPPCGKdSlzTRR+pBhmIqAsJ0fI1fG0g9agdOARCFvEcUpVzxRYFdt\nIntA17sRNqK0y/+O4rKVrvTm2HOoodaZD3cqFII5AoGAD9crgSC0AutvvmDXbd33\nzKFy/kLslKOM/fAVAUwQeu3VLpMR0BI7rACyoD0mxNCdst5NOpTaHeCcyJbDS1AL\n1rFqZ6fR/4h3aSA4xHY/R0D3kbwCWEDXvfqKTHmfDPQaQPXH/eS7z6NjuC9rwyD1\nR2n2eJhLwZTvrietDyLQQ/g=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@cafe-qr-notifications.iam.gserviceaccount.com",
  client_id: "114418519245101635790",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40cafe-qr-notifications.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "cafe-qr-notifications"
});

// Replace with your real FCM token from the Owner Orders page
const ownerToken = 'f2s20G2RZq3m2aYcfm4QQl:APA91bEIBGV19KwsakYQv82Cp4xPJE4HI9PjOWILcmBEVFqm6I0e0YFItilbzoVarevkDgHTmuLD00XIQz5l0WTG31dw6CAyZeLtSd6PIlNu9RAq1bc47Bk';

console.log('🚀 Sending test push notification...');

admin.messaging().send({
  token: ownerToken,
  notification: {
    title: '🔔 Test Push Notification',
    body: 'This is a test from Firebase Admin SDK'
  },
  webpush: {
    notification: {
      sound: 'default',
      requireInteraction: true,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'test-push'
    }
  }
})
.then(response => {
  console.log('✅ Push notification sent successfully!');
  console.log('📧 Message ID:', response);
  process.exit(0);
})
.catch(error => {
  console.error('❌ Error sending push notification:');
  console.error(error);
  process.exit(1);
});
