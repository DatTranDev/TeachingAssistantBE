const Notification = require('../model/notification.js');
const NotificationRecipient = require('../model/notificationRecipient.js');
const firebaseController = require('./firebase_controller.js');

const FcreateNotification = async (notification, recipient, topic) => {
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
          await firebaseController.sendNotification(noti, topic);
          return notification;
        }
        if(recipient.length > 0){
          await firebaseController.sendToSpecificDevice(noti, recipient);
        }
        return notification
      });
    } catch (err) {
      console.error('Create notification failed:', err);
      return null;
    }
};
const getNotification = async (req, res) => {
    const userId = req.user.userId;
    const limit = req.query.limit ? req.query.limit : 10;
    const page = req.query.page ? req.query.page : 1;
    const skip = (page - 1) * limit;
    const notifications = await NotificationRecipient
      .find({receiverId: userId})
      .populate('notificationId')
      .sort({createdAt: -1}).skip(skip).limit(limit);
    return res.status(200).json({   
      notifications
    });
}
const getClassCancelNoti = async (req, res) => {
  const userId = req.user.userId;
  const subjectId = req.params.id;
  const limit = req.query.limit ? req.query.limit : 10;
  const page = req.query.page ? req.query.page : 1;
  const skip = (page - 1) * limit;
  const notifications = await Notification.find({
    type: 'class_cancellation',
    referenceModel: 'Subject',
    referenceId: subjectId
  }).limit(limit).skip(skip);
  return res.status(200).json({
    notifications
  });
}
const readNotification = async (req, res) => {
    const userId = req.user.userId;
    const notificationId = req.params.id;
    await NotificationRecipient.findOneAndUpdate({receiverId: userId, notificationId: notificationId}, {isRead: true});
    return res.status(200).json({
      message: 'Read notification successfully'
    })
}
const readAllNotification = async (req, res) => {
    const userId = req.user.userId;
    await NotificationRecipient.updateMany({receiverId: userId}, {isRead: true});
    return res.status(200).json({
      message: 'Read all notification successfully'
    })
}
const deleteNotification = async (req, res) => {
    const userId = req.user.userId;
    const notificationId = req.params.id;
    await NotificationRecipient.deleteOne({receiverId: userId, notificationId: notificationId});
    return res.status(200).json({
      message: 'Delete notification successfully'
    })
  }
module.exports = {
    FcreateNotification,
    getNotification,
    readNotification,
    readAllNotification,
    deleteNotification,
    getClassCancelNoti
};