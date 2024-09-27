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
        origin:["https://test-gen-ai.vercel.app"],
        methods: ["POST", "GET", "PUT", "DELETE"],
        credentials:true
    }
))

// Login user
app.post("/login", async (req, res) => {
    if ((req.body.email).length === 0) {
        res.status(400).json({error:"The 'Name' or 'email' field cannot be blank!"})
        return
    }
    if ((req.body.password).length === 0) {
        res.status(400).json({error:"The password cannot be blank!"})
        return
    }

    let isUserExists = await User.findOne({ email: req.body.email })
    if(!isUserExists)
    isUserExists = await User.findOne({ name: req.body.email })

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

