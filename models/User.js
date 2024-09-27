const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    dateofcreation: { type: Date, default: Date.now},
    ratings: {type : Number, default: -1},
    feedback: {type : [String], default : []},
});

module.exports = mongoose.model('User', userSchema);