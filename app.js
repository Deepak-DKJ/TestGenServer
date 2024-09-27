const express = require("express");
const app = express();
const cors = require("cors"); 
require('dotenv').config();
//DB configuration
const mongoose = require('mongoose'); 
const connectToMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("CONNECTED TO MONGO");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}
connectToMongo();

// Defining middleware bodyparser to read req.body in between the HTTP req-response cycle
const bodyParser = require('body-parser');
app.use(bodyParser.json());

// Adding routes for authorization
const authRoutes = require('./routes/auth'); 
app.use('/api/auth', authRoutes); 

// Routes for test details
const testDetailsRoutes = require('./routes/test');
app.use('/api/mcqs', testDetailsRoutes)

app.use(cors()); // Use the cors middleware
app.get("/new", (req, res) => {
    console.log("NEW PAGE");
    res.send("LMAO");
});

app.get("/home", (req, res) => {
    console.log(req.body);
    res.send("<h1>Hello World</h1>");
    // res.redirect("/");
});

const PORT = process.env.PORT || 8000;

app.listen(PORT,
    console.log(`Server started on port ${PORT}`)
);

