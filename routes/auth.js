const express = require('express');
const cors = require("cors"); // Import the cors middleware\
const app = express.Router();
require('dotenv').config();
const User = require('../models/User')
const Test = require('../models/Testdetails');
const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0'); // Add leading zero
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Add leading zero
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
var bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchUserFromToken = require('../middleware/getUserDetails');
let JWT_SECRET_SIGN = process.env.JWT_KEY

app.use(cors(
    {
        origin:["https://test-gen-ai.vercel.app", "http://localhost:3000"],
        methods: ["POST", "GET", "PUT", "DELETE"],
        credentials:true
    }
))
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Replace with your Google client ID

app.post("/google/callback", async (req, res) => {
    const token = req.body.token;
    try {
        console.log("Token:", token)
        console.log("Client id", process.env.GOOGLE_CLIENT_ID)
        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,  // Your Google Client ID
        });

        console.log("ticket payload: ", ticket)

        const payload = ticket.getPayload();
        const googleEmail = payload.email;
        const googleName = payload.name;

        // Check if user already exists in your database
        let user = await User.findOne({ email: googleEmail });
        // console.log(googleEmail)
        // console.log(googleName)
        if (!user) {
            // If user doesn't exist, create a new user
            user = new User({
                name: googleName,
                email: googleEmail,
                password:  (Math.random() + 1).toString(36).substring(7), // You can set an empty password for Google users
                dateofcreation: new Date(),
            });
            await user.save();
        }
        const data = {
            name: user.name,
            email: user.email,
            created: formatDate(user.dateofcreation),
        };

        // Create JWT token for the user
        const authToken = jwt.sign({ ID: user.id }, JWT_SECRET_SIGN);
        res.json({ authToken: authToken, userData: data });
    } catch (error) {
        console.error("Error during Google login:", error);
        res.status(400).json({ error: "Google login failed!" });
    }
});

// Login user
app.post("/login", async (req, res) => {
    if ((req.body.email).length === 0) {
        res.status(400).json({error:"The 'Email' field cannot be blank!"})
        return
    }
    if ((req.body.password).length === 0) {
        res.status(400).json({error:"The password cannot be blank!"})
        return
    }

    let isUserExists = await User.findOne({ email: req.body.email })
    // if(!isUserExists)
    // isUserExists = await User.findOne({ name: req.body.email })

    if (!isUserExists) {
        res.status(400).json({error:"Please login with correct credentials!"})
        return
    }
    if (!bcrypt.compareSync(req.body.password, isUserExists.password)) {
        res.status(400).json({error:"Incorrect Password!"})
        return
    }

    let data = {}
    data["name"] = isUserExists.name
    data["email"] = isUserExists.email
    data["created"] = formatDate(isUserExists.dateofcreation)
    const payload = {
        "ID" : isUserExists.id,
    }
    const authToken = jwt.sign(payload, JWT_SECRET_SIGN)
    res.json({ authToken: authToken, "userData" : data })
    return
})

// Create a new User
app.post("/signup", async (req, res) => {
    // console.log("LMAO: ", req)
    let newUser = User(req.body)
    
    console.log("l0")
    if ((req.body.name).length < 3) {
        return res.status(400).json({ error: "The name should have at least 3 characters!" });
    }
    console.log("l1")
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(req.body.email)) {
        return res.status(400).json({error:"Please enter a valid email!"});
    }
    console.log("l2")

    if ((req.body.password).length < 5) {
        res.status(400).json({error:"The length of password should be atleast 5 !"})
        return
    }
    console.log("l3")

    let isUserExists = await User.findOne({ email: req.body.email })
    if (isUserExists) {
        res.status(400).json({error:"A user with this email already exists!"})
        return
    }
    console.log("l4")

    let salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(req.body.password, salt)

    newUser.password = hash

    try {
        const addedUser = await newUser.save()
        const payload = {
            "ID" : addedUser.id
        }
        const authToken = jwt.sign(payload, JWT_SECRET_SIGN)

        res.json({ authToken: authToken })
    }
    catch (err) {
        res.status(500).json({error:"Some internal error occured!"})
        return
    }
})

// Logged in User's details
app.post("/getuser", fetchUserFromToken, async (req, res) => {
    try {
        const user = await User.findById(req.ID).select("-password")
        return res.send(user)
    }
    catch (err) {
        res.status(500).send("Some internal error occured!")
        return
    }
    return res.send("LMAO")
})

module.exports = app;

