const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require('cors')
const userRoute = require("./routes/users");
const ws = require ('ws')
const jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser')
const Message = require('./models/Message');


dotenv.config();

mongoose.connect(
  process.env.MONGO_URL,
  { useNewUrlParser: true, useUnifiedTopology: true },
  () => {
    console.log("Connected to MongoDB");
  }
);


// middleware
app.use(express.json());
app.use(cookieParser())

    // Cors
    const corsOptions = {
      origin: '*',
      credentials: true,
      optionSuccessStatus: 200,
      origin: process.env.CLIENT_URL
    }
    app.use(cors(corsOptions))
app.use("/api", userRoute);

app.post('/api/logout', async (req,res) => {
 await res.cookie('token', '', {sameSite:'none', secure:true}).json('ok');
});

const server = app.listen(process.env.PORT);

const wss = new ws.WebSocketServer({server})

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, process.env.SECRET_KEY, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject('no token');
    }
  });

}

wss.on('connection', (connection,req) => {
  const cookies = req.headers.cookie;
  if(cookies){
    const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='));
    if (tokenCookieString) {
      const token = tokenCookieString.split('=')[1];
      if (token) {
        jwt.verify(token, process.env.SECRET_KEY, {}, (err, userData) => {
          if (err) throw err;
          const {userId, username} = userData;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }

  connection.on('message', async (message) => {
    const messageData = JSON.parse(message.toString())
    const { recipent, text } = messageData
    if(recipent && text){
      const messageDoc = await Message.create({
        sender:connection.userId,
        recipent,
        text,
      });
      [...wss.clients].filter(c => c.userId === recipent)
      .forEach(c => c.send(JSON.stringify({
        text,
        sender : connection.userId,
        recipent,
        _id : messageDoc._id
      })))
    }
  });

  app.get('/api/messages/:userId', async (req,res) => {
try{
  const {userId} = req.params;
  const userData = await getUserDataFromRequest(req);
  const ourUserId = userData.userId;
  const messages = await Message.find({
    sender:{$in:[userId,ourUserId]},
    recipient:{$in:[userId,ourUserId]},
  }).sort({createdAt: 1});
  res.json(messages);
}catch(err){
console.log(err)
}
  });

      [...wss.clients].forEach(client => {
      client.send(JSON.stringify({
        online: [...wss.clients].map(c => ({userId:c.userId,username:c.username})),
      }));
    });

})