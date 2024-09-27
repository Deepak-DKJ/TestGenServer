const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
    },
    options: {
        1: { type: String, required: true },
        2: { type: String, required: true },
        3: { type: String, required: true },
        4: { type: String, required: true },
    },
    correct_answer: {
        type: Number,
        required: true,
    },
    response: {
        type: Number,  
        default: -1
    },
});

const testSchema = new mongoose.Schema({
    user: {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required: true,
    },
    testtitle : {type : String, default:"Title_default"},
    testduration : {type : Number, default:30},
    inputtext: {
        type: String,
        required: true,
    },
    questions: [questionSchema],
    correctanswerpoints : {type : Number, default:4},
    negativemarking : {type : Number, default:1},
    scores : {
        selfscore:{type : Number, default: -1000},
        totalscore: {type : Number, default: 0},
        correct: {type : Number, default: 0},
        wrong: {type : Number, default: 0},
    },
    dateofcreation: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Testdetails', testSchema);