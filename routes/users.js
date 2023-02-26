const router = require("express").Router();
const User = require("../models/User.js");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');


const bcryptSalt = bcrypt.genSaltSync(10);

//REGISTER

router.post('/register', async (req,res) => {
  const {username,email,password} = req.body;
  try {
    const foundUser = await User.findOne({email});
    if(!foundUser){
      const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
      const createdUser = await User.create({
        username:username,
        email:email,
        password:hashedPassword,
      });
      const token = jwt.sign({userId:createdUser._id,username}, process.env.SECRET_KEY)
        res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json({
          msg : "Registered Successfully",
          id: createdUser._id,
        });
    }else{
      res.status(500).json('User Already Exist');
    }
  } catch(err) {
    res.status(500).json('User Already Exist');
  }
});

//LOGIN
router.post('/login', async (req,res) => {
  const {email, password} = req.body;
  try{
    const foundUser = await User.findOne({email});
    if (foundUser) {
      const passOk = bcrypt.compareSync(password, foundUser.password);
      const token = jwt.sign({userId:foundUser._id,username:foundUser.username}, process.env.SECRET_KEY)
      if (passOk) {
            res.cookie('token', token, {sameSite:'none', secure:true}).json({
              msg : "Login Successfully",
              id: foundUser._id,
              username : foundUser.username
      });  
      }else{
        res.status(500).json("Invalid Credentials")
      }
    }
  }catch(err){
   res.status(500).json("Invalid Credentials")
  }

});


// token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2M2YxYWNlYjQ1OGE2N2E5ZTA2NjFlY2IiLCJ1c2VybmFtZSI6IlN5ZWQgQWJk
// dWwgUmFobWFuIiwiaWF0IjoxNjc2NzgyODI3fQ.tFDbYGXkZL-NPb1vhhOjfQlv7XTDzGlMfBIJH17xC5A; Path=/; Secure; SameSite=None

//get user

router.get('/profile', (req,res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, process.env.SECRET_KEY, {}, (err, userData) => {
      if (err) throw err;
      res.json(userData);
    });
  } else {
    res.status(401).json('no token');
  }
});

module.exports = router;
