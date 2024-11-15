const {initializeApp} = require("firebase/app")
const { getMessaging, getToken} = require("firebase/messaging")
const { getStorage, ref, getDownloadURL, uploadBytesResumable } = require("firebase/storage")
const path = require("path")
require("dotenv").config({path: path.join(__dirname, "../.env")});

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
  measurementId: process.env.MEASUREMENT_ID
};

initializeApp(firebaseConfig);

const storage = getStorage();
//const messaging = getMessaging();

const uploadImage = async (req, res) => {
    const file = req.file;
    if(!file) return res.status(400).send('No image in the request')

    const storageRef = ref(storage, `files/${req.file.originalname}`)

    const metaData= {
        contentType: req.file.mimetype
    }

    const snapShot = await uploadBytesResumable(storageRef,req.file.buffer,metaData)

    const downloadURL = await getDownloadURL(snapShot.ref)
    return res.json({
        image: downloadURL
    })
}
// const addDeviceToTopics = async (req, res) => {
//     const {token, topic} = req.body;
//     const response = await getToken(messaging, {
//         vapidKey: process.env.VAPID_KEY,
//         serviceWorkerRegistrationToken: token
//     })

//     console.log(response)
//     return res.json({
//         message: "Device added to topic"
//     })
// }

module.exports = {uploadImage};