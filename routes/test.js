const express = require('express');
const cors = require("cors");
const app = express.Router();
require('dotenv').config();
app.use(cors(
    {
        origin: ["https://test-gen-ai.vercel.app", "http://localhost:3000"],
        methods: ["POST", "GET", "PUT", "DELETE"],
        credentials: true
    }
))

const User = require('../models/User')

const Test = require('../models/Testdetails');
const fetchUserFromToken = require('../middleware/getUserDetails');

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-pro" });
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0'); // Add leading zero
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Add leading zero
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

app.get("/getalltests", fetchUserFromToken, async (req, res) => {
    // console.log(req.ID)
    const tests = await Test.find({ user: req.ID })
    let data = []
    for (const ind in tests) {
        const test = tests[ind]
        const entry = {
            "testId": test._id,
            "description": ((test.inputtext).slice(0, 200) + " . . . "),
            "createdOn": formatDate(test.dateofcreation),
            "totalQuestions": (test.questions).length,
            "score": `${(test.scores.selfscore) === -1000 ? "NA" : test.scores.selfscore}/${test.scores.totalscore}`,
            "correctAnswerPoints": test.correctanswerpoints,
            "negativeMarking": test.negativemarking,
            "title": test.testtitle,
            "testDuration": test.testduration,
            "scorecard": test.scores
        }
        data.unshift(entry)
    }
    res.json(data)
})

app.get("/getprofile", fetchUserFromToken, async (req, res) => {
    // console.log(req.ID)
    const tests = await Test.find({ user: req.ID })
    let data = {}
    const total = tests.length;
    let pending = 0
    for (const ind in tests) {
        const test = tests[ind]
        if (test.scores.selfscore === -1000)
            pending++;
    }
    data["total"] = total
    data["pending"] = pending
    res.json(data)
})

app.get("/gettest/:id", fetchUserFromToken, async (req, res) => {
    try {
        const userid = req.ID; // Extract user ID from middleware
        const testId = req.params.id; // Extract test ID from URL params

        const test = await Test.findOne({ _id: testId, user: userid });

        if (!test) {
            return res.status(404).json({ error: "Test not found or unauthorized" });
        }

        const data = {
            "testTitle": test.testtitle,
            "testDuration": test.testduration,
            "questions": test.questions,
            "crtAnswer": test.correctanswerpoints,
            "negMarking": test.negativemarking,
            "score": test.scores.selfscore,
            "total": test.scores.totalscore,
            "correct": test.scores.correct,
            "wrong": test.scores.wrong
        }

        res.status(200).json({ "testDetails": data });
        return
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
})

const getQuestionsFromDoc = async (prompt, uploadedFile) => {
    const buffer = uploadedFile.buffer;
    const mimeType = uploadedFile.mimetype;
    const base64Data = buffer.toString("base64");
    const contents = [
        {
            parts: [
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType,
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
    ];
    const result = await model.generateContent({ contents });
    // console.log(result)
    return result;
};
app.post("/addtest", upload.single("uploadedDoc"), fetchUserFromToken, async (req, res) => {
    try {
        let inputType = "text"
        if (req.file !== undefined)
            inputType = "attached file";
        const _id = req.ID;
        let input_data = req.body.inp;
        let number_of_questions = req.body.qsns;
        const level = req.body.lvl;
        // console.log(level)

        let prompt = `Given the following ${inputType}, generate exactly `;
        prompt += (number_of_questions.toString());
        prompt += ` multiple-choice questions (MCQs), with difficulty level: ${level}.`;

        prompt += 'No more, no less. Each question should have 4 answer options, with one correct answer. Structure the output in a String format as follows: Return an overall string that has series of lines in which each line represents a mcq. A line has 6 parts(as strings) separated by five "|" PIPE symbol for each question in every line. 1st string - question, Options : 2nd, 3rd, 4th & 5th, 6th part of line, then option number for correct answer, then "$". Dollar marks end of a line(question). Example: "question|option1|option2|option3|option4|ansis4$question|option1|option2|option3|option4|ansis2$question|... and so on.... DO NOT return question number and RETURN a single output string. The MCQs should be relevant to the content of the provided '
        prompt += inputType + '.' + "\n\n" + input_data;

        let result;
        if (req.file == undefined)
            result = await model.generateContent(prompt);
        else
            result = await getQuestionsFromDoc(prompt, req.file)
        // console.log(result)
        const dat = result.response.text()
        // console.log("AI RESPONSE: ", dat);
        let Lines = dat.split("$").filter(line => line.trim() !== "");

        if (input_data === "")
            input_data = dat;
        let questions = []
        for (const ind in Lines) {
            const Line = Lines[ind]
            // console.log("Line : \n", Line)
            const parts = Line.split('|')
            if (parts.length != 6)
                continue

            let cor_ans = parts[5]
            // console.log(parts)
            cor_ans = Number(cor_ans.replace("ansis", ""))
            cor_ans_string = parts[cor_ans]

            let options_list = [];
            for (let i = 1; i <= 4; i++) {
                options_list.push(parts[i])
            }
            // SHuffle options
            for (let i = options_list.length - 1; i > 0; i--) {
                let j = Math.floor(Math.random() * (i + 1)); // Pick a random index
                [options_list[i], options_list[j]] = [options_list[j], options_list[i]]; // Swap elements
            }
            for (let i = 0; i < 4; i++) {
                if (options_list[i] === cor_ans_string) {
                    cor_ans = i + 1;
                    break;
                }
            }
            // console.log(options_list, cor_ans)
            const qs_details = {
                question: parts[0],
                options: {
                    1: options_list[0],
                    2: options_list[1],
                    3: options_list[2],
                    4: options_list[3],
                },
                correct_answer: cor_ans
            }

            questions.push(qs_details)

            if (questions.length === number_of_questions)
                break;
        }

        // Create a new test item
        // console.log(questions)
        if (questions.length === 0) {
            return res.status(500).json({
                message: "Could not generate any questions",
                airesp: dat
            });
        }
        const newTest = new Test({
            user: _id, // _id is from middleware
            inputtext: input_data,
            questions: questions
        });

        // Save the test item into the database
        const savedTest = await newTest.save();
        return res.status(200).json({
            message: "Test added successfully",
            qsns: questions.length,
            test_id: savedTest._id
        });


    } catch (error) {
        if (error.message && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
            return res.status(500).json({
                message: "Rate limit exceeded. Please try again later.",
                airesp: "Rate limit exceeded. Please try again later or check billing details."
            });
        }
        console.error(error.message);
        // return res.status(500).json({ error: "Internal Server Error" });
        return res.status(500).json({ error: error.message });
    }
})
app.put("/feedbacks", fetchUserFromToken, async (req, res) => {
    const userid = req.ID;
    const user = await User.findOne({ _id: userid })
    // console.log(user)
    user.ratings = req.body.rating
    user.feedback.push(req.body.feedback)
    await user.save();

    res.status(200).json({ message: "Test updated successfully" });
    return
})
app.put("/updatetest/:id", fetchUserFromToken, async (req, res) => {
    try {
        const userid = req.ID; // Extract user ID from middleware
        const testId = req.params.id; // Extract test ID from URL params
        // console.log(req.body)
        const details = req.body; // New data with responses

        const test = await Test.findOne({ _id: testId, user: userid });

        if (!test) {
            return res.status(404).json({ error: "Test not found or unauthorized" });
        }

        if ("testScore" in details) {
            test.questions = details.updatedQuestionsList
            test.scores.selfscore = details.testScore
            test.scores.correct = details.correctQsns
            test.scores.wrong = details.wrongQsns
        }
        else {
            test.testtitle = details.title
            test.testduration = details.duration
            test.correctanswerpoints = details.correctMarks;
            test.negativemarking = details.negMarks;
            test.scores.totalscore = (details.qsCount) * (details.correctMarks)
        }
        await test.save();

        res.status(200).json({ message: "Test updated successfully" });
        return
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
})

app.delete("/deletetest/:id", fetchUserFromToken, async (req, res) => {
    try {
        const _id = req.ID; // Extract user ID from middleware
        const testId = req.params.id; // Extract test ID from URL params

        // Find the test and delete it if it belongs to the authenticated user
        const deletedTest = await Test.findOneAndDelete({ _id: testId, user: _id });

        // Check if the test was found and deleted
        if (!deletedTest) {
            return res.status(404).json({ error: "Test not found or unauthorized" });
        }

        return res.status(200).json({
            message: "Test deleted successfully",
            test: deletedTest
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
})

module.exports = app

