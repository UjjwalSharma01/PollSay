const express = require('express');
const app = express();
const port = 3000;

// Firebase admin SDK to access Firestore from the server
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with service account
var serviceAccount = require("./hackathon-d9723-firebase-adminsdk-vl1a6-68df52b0dd.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

let db = admin.firestore();

// TO redirect node to the given file location
app.use(express.static(__dirname));


app.get('/form/:id', async (req, res) => {
    // Fetch the form data from Firestore using the ID from req.params.id
    let docRef = db.collection('forms').doc(req.params.id);
    let doc = await docRef.get();
    if (!doc.exists) {
        console.log('No such document!');
        res.status(404).send('Not found');
    } else {
        let data = doc.data();
        let question = data.question;
        let options = data.options;

        // Generate the HTML content using the form data
        let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Poll ${req.params.id}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                    }
                    h1 {
                        color: #333;
                    }
                    p {
                        color: #666;
                    }
                    .option {
                        background-color: #f0f0f0;
                        margin: 10px 0;
                        padding: 10px;
                        border-radius: 5px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>PollSay</h1>
                </div>
                <form action="/submit/${req.params.id}" method="post">
                    <h2>${question}</h2>
                    ${options.map((option, index) => `
                        <div class="option">
                            <input type="radio" id="option${index}" name="option" value="${option}">
                            <label for="option${index}">${option}</label>
                        </div>
                    `).join('')}
                    <input type="submit" value="Submit">
                </form>
            </body>
            </html>
        `;

        res.send(htmlContent);
    }
});

app.post('/submit/:id', express.urlencoded({ extended: true }), async (req, res) => {
    let formId = req.params.id;
    let selectedOption = req.body.option;

    // Save the selected option to Firestore
    let docRef = db.collection('forms').doc(formId);
    let doc = await docRef.get();
    if (!doc.exists) {
        console.log('No such document!');
        res.status(404).send('Not found');
    } else {
        let data = doc.data();
        if (!data.responses) {
            data.responses = {};
        }
        if (!data.responses[selectedOption]) {
            data.responses[selectedOption] = 0;
        }
        data.responses[selectedOption]++;
        await docRef.set(data);
        // res.send('Thank you for your submission!');
        res.redirect('/thankyou.html');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});