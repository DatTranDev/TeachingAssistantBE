const {initializeApp, cert} = require("firebase-admin/app")
const { getMessaging} = require("firebase-admin/messaging")
const { getStorage, getDownloadURL} = require("firebase-admin/storage");
const { type } = require("os");
const path = require("path")
require("dotenv").config({path: path.join(__dirname, "../.env")});
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS)

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
  measurementId: process.env.MEASUREMENT_ID
};

initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.STORAGE_BUCKET
  });

const storage = getStorage();
const bucket = storage.bucket();
const messaging = getMessaging();

// const uploadImage = async (req, res) => {
//     const file = req.file;
//     if(!file) return res.status(400).send('No image in the request')

//     const storageRef = ref(storage, `files/${req.file.originalname}`)

//     const metaData= {
//         contentType: req.file.mimetype
//     }

//     const snapShot = await uploadBytesResumable(storageRef,req.file.buffer,metaData)

//     const downloadURL = await getDownloadURL(snapShot.ref)
//     return res.json({
//         image: downloadURL
//     })
// }
const uploadImage = async (req, res) => {
    const file = req.file;
    if(!file) 
      return res.status(400).send('No image in the request')
    const timestamp = Date.now();
    const originalName = req.file.originalname;
    const newFileName = `${originalName}_${timestamp}`;

    const storageRef = bucket.file(`files/${newFileName}`)

    const metaData= {
        contentType: req.file.mimetype
    }

    const snapShot = await storageRef.save(req.file.buffer, {
        metadata: metaData
    }).catch(err=>{
      return res.status(500).send(err)
    })

    const downloadURL = await getDownloadURL(storageRef)

    return res.json({
        image: downloadURL
    })
}
const subscribeToTopic = async (req, res) => {
    const {token, topics} = req.body;
    if(!token || !topics) 
        return res.status(400).send('Missing token or topic')
    try{
        for(let topic of topics)
            await messaging.subscribeToTopic(token, topic)
    }catch(err){
        return res.status(500).json({
          message: 'Failed to subscribe to topic '+err  
        })
    }
    return res.status(200).send('Subscribed to topic')
}
const unsubscribeFromTopic = async (req, res) => {
    const {token, topic} = req.body;
    if(!token || !topic) return res.status(400).send('Missing token or topic')
    await messaging.unsubscribeFromTopic(token, topic).catch(err=>{
        return res.status(500).json({
          message: 'Failed to unsubscribe from topic '+err  
        })
    });
    return res.status(200).send('Unsubscribed from topic')
}
const sendToSpecificDevice = async (req, res) => {
    const {token, notification} = req.body;
    if(!token || !notification) return res.status(400).send('Missing token or notification')
    const message = {
        data:{
            "test": "test"
        },
        notification: {
            title: notification.title,
            body: notification.body
        },
        token: token
    }
    try{
        await messaging.send(message)
    }catch(err){
        return res.status(500).json({
          message: 'Failed to send notification '+err  
        })
    }
    return res.status(200).send('Notification sent')
}
const sendNotification = async(message, topic)=>{
    const msg = {
        notification: {
            title:  message.type!='attendance'
                    ? message.title
                    : 'Điểm danh ngay!',
            body:  message.type!='attendance'  
                    ? `${message.sender}: ${message.body}`
                    : `Môn học: ${message.subject}\nPhòng: ${message.room}`
        },
        data: {
            sender: message.senderId,
            type: message.type,
            subject: message.subject,
            room: message.room,
        },
        topic: topic
    }
    await messaging.send(msg).catch(err=>{
        return false;
    });
    return true;
}
const subscribe = async(token, topic)=>{
    await messaging.subscribeToTopic(token, topic).catch(
        err=>{
            return false;
        }
    );
    return true;
}
const unsubscribe = async(token, topic)=>{
    await messaging.unsubscribeFromTopic(token, topic).catch(
        err=>{
            return false;
        }
    );
    return true;
  }

module.exports = {
    uploadImage, 
    subscribeToTopic, 
    unsubscribeFromTopic, 
    sendNotification, 
    subscribe, 
    unsubscribe, 
    sendToSpecificDevice
};