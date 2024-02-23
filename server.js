const express = require('express');
const app = express();
const port = 3000;

// Firebase admin SDK to access Firestore from the server
const admin = require('firebase-admin');
admin.initializeApp();
let db = admin.firestore();

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
            </head>
            <body>
                <h1>${question}</h1>
                ${options.map(option => `<p>${option}</p>`).join('')}
            </body>
            </html>
        `;

        res.send(htmlContent);
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});