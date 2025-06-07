const express = require('express');
const app = express();
const mongoose = require('mongoose');
const authJwt = require('./middlewares/expressJwt.js');
const cors = require('cors');
const morgan = require('morgan');
const userRoute = require('./route/user_route.js');
const tokenRoute = require('./route/token_route.js');
const subjectRoute = require('./route/subject_route.js');
const classSessionRoute = require('./route/classSession_route.js');
const questionRoute = require('./route/question_route.js');
const channelRoute = require('./route/channel_route.js');   
const cAttendRoute = require('./route/cAttend_route.js');
const reviewRoute = require('./route/review_route.js');
const serviceRoute = require('./route/service_route.js');
const uploadRoute = require('./route/upload_route.js');
const firebaseRoute = require('./route/firebase_route.js');
const documentRoute = require('./route/document_route.js');
const discussionRoute = require('./route/discussion_route.js');
const absenceRoute = require('./route/absence_route.js');
const notificationRoute = require('./route/notification_route.js');
const FirebaseService = require('./services/firebase.service.js');
const groupRoute = require('./route/group_route.js');
const systemRoute = require('./route/system_route.js');

const ErrorHandler = require('./middlewares/error.middleware.js');

const http = require('http').createServer(app);

require('dotenv').config();

const PORT = process.env.PORT;
const api = process.env.API_URL;
const url = process.env.ATLAS_URI;

///Start server///
mongoose.connect(url).then(
    res =>{
        console.log("Connect mongoDB successfully");
        http.listen(PORT, ()=>{
                console.log("Listen and run at port: " + PORT)
        })
    }
).catch(
    err=>{
        console.log(err)
    }
)

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(authJwt());
app.get('/helloworld', (req, res) => {
    return res.status(200).json({
        message: "Hello World"
    });
});

app.use(`${api}/user`, userRoute);
app.use(`${api}/token`, tokenRoute);
app.use(`${api}/subject`, subjectRoute);
app.use(`${api}/classSession`, classSessionRoute);
app.use(`${api}/question`, questionRoute);
app.use(`${api}/channel`, channelRoute);
app.use(`${api}/cAttend`, cAttendRoute);
app.use(`${api}/review`, reviewRoute);
app.use(`${api}/service`, serviceRoute);
app.use(`${api}/upload`, uploadRoute);
app.use(`${api}/firebase`, firebaseRoute);
app.use(`${api}/document`, documentRoute);
app.use(`${api}/discussion`, discussionRoute);
app.use(`${api}/absence`, absenceRoute);
app.use(`${api}/notification`, notificationRoute);
app.use(`${api}/group`, groupRoute);
app.use(`${api}/system`, systemRoute);

app.use(ErrorHandler);  

//  Socket
const { Server } = require('socket.io');
const io = new Server(http, {
    cors: {
        origin: '*',
    }
});
let onlineUsers = [];
io.on('connection', (socket) => {
    console.log(`${socket.id} connected`);

    socket.on("addOnlineUser", (userID)=>{
        const check = onlineUsers?.some((user) => user.userID == userID) 
        if(check){
         const index = onlineUsers.findIndex((user) => user.userID == userID)
         onlineUsers[index].socketID = socket.id
        }else{
         onlineUsers.push({
             userID: userID,
             socketID: socket.id
         })
        }
         
         console.log(onlineUsers)
         io.emit("getOnlineUsers", onlineUsers)
     })

    socket.on("joinSubject", ({ userID, subjectID }) => {
        socket.join(subjectID);  
        console.log(`${userID} joined subject room: ${subjectID}`);
        
    });

    socket.on("joinSubjectChannel", ({ userID, subjectID, channelID }) => {
        const roomName = `${subjectID}_${channelID}`;  

        socket.join(roomName);
        console.log(`${userID} joined channel room: ${roomName}`);       
    });

    socket.on("sendMessageToSubject", async ({ subjectID, message, dataMsg }) => {
        io.to(subjectID).emit("receiveSubjectMessage", message);
        try{
            await FirebaseService.sendNotification(dataMsg, subjectID)
        }catch(err){
            console.log(err)
        }
        //console.log(`Message from ${dataMsg.sender} sent to subject room: ${subjectID}`);
    });

    socket.on("sendMessageToChannel", async ({ subjectID, channelID, message, dataMsg }) => {
        const roomName = `${subjectID}_${channelID}`;  
        io.to(roomName).emit("receiveChannelMessage", message);
        try{
            await FirebaseService.sendNotification(dataMsg, subjectID);
        }catch(err){
            console.log(err)
        }
        //console.log(`Message from ${dataMsg.sender} sent to channel room: ${roomName}`);
    });

    socket.on("sendReaction", ({ subjectID, messageID, reaction }) => {
        const roomName = `${subjectID}`;  
        io.to(roomName).emit("receiveReaction", { messageID, reaction });
    });
    socket.on('sendUpdateReaction', ({subjectID, messageID, reaction})=>{
        const roomName = `${subjectID}`;  
        io.to(roomName).emit("receiveUpdateReaction", { messageID, reaction });
    })
    socket.on('sendAttendance', ({subjectID, student, index, status})=>{
        const roomName = `${subjectID}`;  
        io.to(roomName).emit("receiveUserAttendance", {student, index, status});
    })
    socket.on('sendUpdateAttendance', ({subjectID, student})=>{
        const roomName = `${subjectID}`;  
        io.to(roomName).emit("receiveUpdateAttendance", student);
    })
    socket.on('sendResolve', ({subjectID, messageID})=>{
        const roomName = `${subjectID}`;
        io.to(roomName).emit("receiveResolve", messageID);
    })  
    socket.on('sendDeleteMessage', ({subjectID, messageID})=>{
        const roomName = `${subjectID}`;
        io.to(roomName).emit("receiveDeleteMessage", messageID);
    })

    socket.on("leaveSubjectChannel", ({ userID, subjectID, channelID }) => {
        const roomName = `${subjectID}_${channelID}`;
        socket.leave(roomName);
        console.log(`${userID} left room: ${roomName}`);

    });
    socket.on("leaveSubject", ({ userID, subjectID }) => {
        socket.leave(subjectID);
        console.log(`${userID} left room: ${subjectID}`);
    });
    
    socket.on("attendace", async ({subjectID, dataMsg})=>{
        io.to(subjectID).emit("receiveAttendance", dataMsg)
        try{
            await FirebaseService.sendNotification(dataMsg, subjectID)
        }catch(err){
            console.log(err)
        }
        console.log(`Attendance from ${dataMsg.sender} sent to subject room: ${subjectID}`);
    })


    socket.on("disconnect", ()=>{
        onlineUsers = onlineUsers.filter((user)=> user.socketID !== socket.id)
        console.log(socket.id, " disconnect")
        io.emit("getOnlineUsers", onlineUsers)
    })
});
