const {initializeApp, cert} = require("firebase-admin/app")
const { getMessaging} = require("firebase-admin/messaging")
const { getStorage, getDownloadURL} = require("firebase-admin/storage");
const Document = require("../model/document.js");
const CAttend = require("../model/cAttend.js");
const FCMToken = require("../model/FCMToken.js");
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
const uploadImages = async (req, res) => {
    const files = req.files;
    if(!files)
        return res.status(400).send('No images in the request')
    const timestamp = Date.now();
    const images = [];
    await Promise.all(files.map(async file=>{
        const originalName = file.originalname;
        const newFileName = `${originalName}_${timestamp}`;
        const storageRef = bucket.file(`files/${newFileName}`)
        const metaData= {
            contentType: file.mimetype
        }
        const snapShot = await storageRef.save(file.buffer, {
            metadata: metaData
        }).catch(err=>{
          return res.status(500).send(err)
        })
        const downloadURL = await getDownloadURL(storageRef)
        images.push(downloadURL)
    }))
    return res.json({
        images: images
    })
}
const uploadFile = async (req, res) => {
    const file = req.file;
    if(!file) 
      return res.status(400).send('No file in the request')
    const {name, type, cAttendId} = req.query;
    if(!name || !type || !cAttendId)
    {
        console.log(name, type, cAttendId)
        return res.status(400).send('Missing name, type or cAttendId')
    }
    const cAttend = await CAttend.findById(cAttendId);
    if(!cAttend)
        return res.status(404).send('CAttend not found')
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
    const document = new Document({
        name: name,
        dowloadUrl: downloadURL,
        type: type,
        cAttendId: cAttendId
    })
    await document.save().then(document=>{
        return res.json({
            document: document
        })
    }).catch(err=>{
        return res.status(500).send(err)
    })
    
}
const subscribeToTopic = async (req, res) => {
    const {token, topics} = req.body;
    const userId = req.user.userId;
    if(!token || !topics) 
        return res.status(400).send('Missing token or topic')
    try{
        await Promise.all(topics.map(async topic=>{
            await messaging.subscribeToTopic(token, topic)
        }))
        await FCMToken.findOneAndUpdate({user: userId}, {FCMToken: token})
    }catch(err){
        return res.status(500).json({
          message: 'Failed to subscribe to topic '+err  
        })
    }
    return res.status(200).send('Subscribed to topic')
}
const unsubscribeFromTopics = async (req, res) => {
    const {token, topics} = req.body;
    if(!token || !topics) 
        return res.status(400).send('Missing token or topic')
    try{
        await Promise.all(topics.map(async topic=>{
            await messaging.unsubscribeFromTopic(token, topic)
        }))
    }catch(err){
        return res.status(500).json({
          message: 'Failed to unsubscribe from topic '+err  
        })
    }
    return res.status(200).send('Unsubscribed from topic')
}
const sendToSpecificDevice = async (message, recipients) => {
    try {
      // Lấy tất cả FCM Token của các user nhận
      const tokens = await FCMToken.find(
        { user: { $in: recipients } },
        'FCMToken'
      ).lean();
  
      const tokenList = tokens.map(t => t.token).filter(Boolean);
  
      if (tokenList.length === 0) return false;
      for(let i=0; i<tokenList.length; i++){
        const msg = {
          notification: {
            title: message.title,
            body: message.body
          },
          data: {
            sender: message.senderId?.toString() || '',
            type: message.type || '',
            subject: message.subject || '',
            room: message.room || ''
          },
          token: tokenList[i]
        };
        await messaging.send(msg).catch(err=>{
            return false;
        });
      }
  
      return true;
    } catch (err) {
      console.error('Error sending FCM:', err);
      return false;
    }
  };
const sendNotification = async(message, topic)=>{
    try{
        const msg = {
            notification: {
                title:  message.type!='attendance'
                        ? message.title
                        : 'Điểm danh ngay!',
                body:  message.type!='attendance'  
                        ? `${message.sender}: ${message.body}`
                        : `Môn học: ${message.subject}`
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
    catch(err){
        return false;
    }
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
const getURL = async (file) => {
    const timestamp = Date.now();
    const originalName = file.originalname;
    const newFileName = `${originalName}_${timestamp}`;

    const storageRef = bucket.file(`files/${newFileName}`)
    const metaData= {
        contentType: file.mimetype
    }
    const snapShot = await storageRef.save(file.buffer, {
        metadata: metaData
    }).catch(err=>{
      return null;
    })
    const downloadURL = await getDownloadURL(storageRef)
    return downloadURL
}

module.exports = {
    uploadImage, 
    uploadImages,
    uploadFile,
    subscribeToTopic, 
    unsubscribeFromTopics, 
    sendNotification, 
    subscribe, 
    unsubscribe, 
    sendToSpecificDevice,
    getURL
};