const Notification = require('../model/notification.js');
const NotificationRecipient = require('../model/notificationRecipient.js');
const FirebaseService = require('./firebase.service.js');
const AppError = require('../utils/AppError.js');

const NotificationService = {
    create: async (notification)=>{
        return await Notification.create(notification).catch(err => {
            throw new AppError(`Error creating notification: ${err.message}`, 500);
        });
    },
    send: async (notification, recipient, topic) => {
        try {
          return await Notification.create(notification).then(async (notification) => {
            await NotificationRecipient.insertMany(recipient.map((r) => {
              return { notificationId: notification._id, receiverId: r};
            }));
            const noti = {
              title: notification.title,
              body: notification.content,
            }
            if (topic) {
              await FirebaseService.sendNotification(noti, topic);
              return notification;
            }
            if(recipient.length > 0){
              await FirebaseService.sendToSpecificDevice(noti, recipient);
            }
            return notification
          });
        } catch (err) {
          console.error('Create notification failed:', err);
          return null;
        }
    },
    get: async (userId, page, limit) =>{
        const skip = (page - 1) * limit;
        const notifications = await NotificationRecipient
          .find({receiverId: userId})
          .populate('notificationId')
          .sort({createdAt: -1}).skip(skip).limit(limit).catch(err => {
            throw new AppError(`Error fetching notifications: ${err.message}`, 500);
          });
        return notifications;
    },
    getClassCancelNoti: async (subjectId, page, limit) => {
        const skip = (page - 1) * limit;
        const notifications = await Notification.find({
          type: 'class_cancellation',
          referenceModel: 'Subject',
          referenceId: subjectId
        }).limit(limit).skip(skip).catch(err => {
          throw new AppError(`Error fetching class cancellation notifications: ${err.message}`, 500);
        });
        return notifications;
    },
    getClassRescheduleNoti: async (subjectId, page, limit) => {
        const skip = (page - 1) * limit;
        const notifications = await Notification.find({
          type: 'class_reschedule',
          referenceModel: 'Subject',
          referenceId: subjectId
        }).limit(limit).skip(skip).catch(err => {
          throw new AppError(`Error fetching class reschedule notifications: ${err.message}`, 500);
        });
        return notifications;
    },
    read: async(userId, notificationId) => {
        await NotificationRecipient.findOneAndUpdate(
            {receiverId: userId, notificationId: notificationId}, 
            {isRead: true}
        ).catch(err => {
            throw new AppError(`Error marking notification as read: ${err.message}`, 500);
        });
    },
    readAll: async(userId) => {
        await NotificationRecipient.updateMany(
            {receiverId: userId}, 
            {isRead: true}
        ).catch(err => {
            throw new AppError(`Error marking all notifications as read: ${err.message}`, 500);
        });
    },
    delete: async(userId, notificationId) => {
        await NotificationRecipient.deleteOne(
            {receiverId: userId, notificationId: notificationId}
        ).catch(err => {
            throw new AppError(`Error deleting notification: ${err.message}`, 500);
        });
    }
};

module.exports = NotificationService;