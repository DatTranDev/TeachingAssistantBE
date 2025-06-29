const { bucket, messaging } = require('../config/firebase');
const { getDownloadURL} = require("firebase-admin/storage");
const TokenService = require('./token.service.js');
const {AppError} = require("../utils/AppError.js");
const DocumentService = require('./document.service.js');

const FirebaseService = {
    uploadImage: async(file) => {
        const timestamp = Date.now();
        const originalName = file.originalname;
        const newFileName = `${originalName}_${timestamp}`;

        const storageRef = bucket.file(`files/${newFileName}`)

        const metaData= {
            contentType: file.mimetype
        }

        await storageRef.save(file.buffer, {
            metadata: metaData
        }).catch(err=>{
          throw new AppError(err.message, 500);
        })

        const downloadURL = await getDownloadURL(storageRef).catch(err=>{
            throw new AppError(err.message, 500);
        })
        return downloadURL;
    },
    uploadImages: async(files) => {
        const timestamp = Date.now();
        const images = [];
        await Promise.all(files.map(async file=>{
            const originalName = file.originalname;
            const newFileName = `${originalName}_${timestamp}`;
            const storageRef = bucket.file(`files/${newFileName}`)
            const metaData= {
                contentType: file.mimetype
            }
            await storageRef.save(file.buffer, {
                metadata: metaData
            }).catch(err=>{
              throw new AppError(err.message, 500);
            })
            const downloadURL = await getDownloadURL(storageRef).catch(err=>{
                throw new AppError(err.message, 500);
            });
            images.push(downloadURL)
        }))
        return images;
    },
    uploadFile: async(file, data) => {
        const downloadURL = await this.getURL(file);
        const doc = {
            name: data.name,
            dowloadUrl: downloadURL,
            type: data.type,
            cAttendId: data.cAttendId
        };
        const document = await DocumentService.add(doc);
        return document;
    },
    subscribeToTopic: async(token, topics, userId) => {
        try{
            await Promise.all(topics.map(async topic => {
                await messaging.subscribeToTopic(token, topic).catch(err => {
                    throw new AppError('Failed to subscribe to topic: ' + err.message, 500);
                });
            }));
            await TokenService.addFCM(userId, token);
        }catch(err){
            throw new AppError('Failed to subscribe to topic: ' + err.message, 500);
        }
    },
    unsubscribeFromTopics: async(token, topics) => {
        try{
            await Promise.all(topics.map(async topic => {
                await messaging.unsubscribeFromTopic(token, topic).catch(err => {
                    throw new AppError('Failed to unsubscribe from topic: ' + err.message, 500);
                });
            }));
            await TokenService.removeFCM(token);
        }catch(err){
            throw new AppError('Failed to unsubscribe from topic: ' + err.message, 500);
        }
    },
    sendToSpecificDevice: async(message, recipients) => {
        try {
            const tokenList = await TokenService.getFCMs(recipients);
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
                    throw new AppError('Error sending FCM: ' + err.message, 500);
                });
            }
            return true;
        } catch (err) {
            console.error('Error sending FCM:', err);
            return false;
        }
    },
    sendNotification: async(message, topic) => {
        try {
            const msg = {
                notification: {
                    title: message.type !== 'attendance' ? message.title : 'Điểm danh ngay!',
                    body: message.type !== 'attendance' ? `${message.sender}: ${message.body}` : `Môn học: ${message.subject}`
                },
                data: {
                    sender: message.senderId ? String(message.senderId) : '',
                    type: message.type ? String(message.type) : '',
                    subject: message.subject ? String(message.subject) : '',
                    room: message.room ? String(message.room) : '',
                },
                topic: topic
            };
            await messaging.send(msg).catch(err => {
                throw new AppError('Error sending FCM: ' + err.message, 500);
            });
            return true;
        } catch (err) {
            console.error('Error sending FCM:', err);
            return false;
        }
    },
    subscribe: async(token, topic) => {
        try {
            await messaging.subscribeToTopic(token, topic).catch(err => {
                throw new AppError('Failed to subscribe to topic: ' + err.message, 500);
            });
            return true;
        } catch (err) {
            console.error('Error subscribing to topic:', err);
            return false;
        }
    },
    unsubscribe: async(token, topic) => {
        try {
            await messaging.unsubscribeFromTopic(token, topic).catch(err => {
                throw new AppError('Failed to unsubscribe from topic: ' + err.message, 500);
            });
            return true;
        } catch (err) {
            console.error('Error unsubscribing from topic:', err);
            return false;
        }
    },
    getURL: async(file) => {
        const timestamp = Date.now();
        const originalName = file.originalname;
        const newFileName = `${originalName}_${timestamp}`;

        const storageRef = bucket.file(`files/${newFileName}`)
        const metaData= {
            contentType: file.mimetype
        }
        await storageRef.save(file.buffer, {
            metadata: metaData
        }).catch(err=>{
          throw new AppError(err.message, 500);
        })
        const downloadURL = await getDownloadURL(storageRef)
        return downloadURL;
    }
}
module.exports = FirebaseService;