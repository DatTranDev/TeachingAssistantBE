const express = require('express');
const app = express();
const mongoose = require('mongoose');
const authJwt = require('./pkg/middleware/expressJwt.js');
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
//  Socket
const { Server } = require('socket.io');
const io = new Server(http, {
    cors: {
        origin: '*',
    }
});
io.on('connection', (socket) => {
    console.log(`${socket.id} connected`);
    
    socket.on("joinSubject", ({ userID, subjectID }) => {
        socket.join(subjectID);  
        console.log(`${userID} joined subject room: ${subjectID}`);
        
    });

    socket.on("joinSubjectChannel", ({ userID, subjectID, channelID }) => {
        const roomName = `${subjectID}_${channelID}`;  

        socket.join(roomName);
        console.log(`${userID} joined channel room: ${roomName}`);       
    });

    socket.on("sendMessageToSubject", ({ subjectID, message, senderID }) => {

        io.to(subjectID).emit("receiveSubjectMessage", message);
        console.log(`Message from ${senderID} sent to subject room: ${subjectID}`);
    });

    socket.on("sendMessageToChannel", ({ subjectID, channelID, message, senderID }) => {
        const roomName = `${subjectID}_${channelID}`;  

        io.to(roomName).emit("receiveChannelMessage", message);
        console.log(`Message from ${senderID} sent to channel room: ${roomName}`);
    });

    socket.on("leaveSubjectChannel", ({ userID, subjectID, channelID }) => {
        const roomName = `${subjectID}_${channelID}`;
        socket.leave(roomName);
        console.log(`${userID} left room: ${roomName}`);

    });
    socket.on("leaveSubject", ({ userID, subjectID }) => {
        socket.leave(subjectID);
        console.log(`${userID} left room: ${subjectID}`);
    });

});
