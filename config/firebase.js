const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: process.env.STORAGE_BUCKET,
});

const messaging = getMessaging(app);
const storage = getStorage(app);
const bucket = storage.bucket();

module.exports = {
  messaging,
  bucket,
};
