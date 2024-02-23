// Initialize firebase
const firebaseConfig = {
    apiKey: "AIzaSyAxr-SPca9kxklClFxHYkYn0h4HOaX49Mo",
    authDomain: "hackathon-d9723.firebaseapp.com",
    projectId: "hackathon-d9723",
    storageBucket: "hackathon-d9723.appspot.com",
    messagingSenderId: "885132274630",
    appId: "1:885132274630:web:e0ec9087076c703235a0c7",
    measurementId: "G-BHPSWF6M12"
};
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();


document.getElementById('pollForm').addEventListener('submit', function(event) {
    event.preventDefault();

    let question = document.getElementById('question').value;
    let options = document.getElementById('options').value.split(',');
    let timeStart = document.getElementById('timeStart').value;
    let timeEnd = document.getElementById('timeEnd').value;
    let maxChoices = document.getElementById('maxChoices').value;
    let requireUniqueID = document.getElementById('requireUniqueID').checked;
    let requireCaptcha = document.getElementById('requireCaptcha').checked;

    // Add a new document with a generated ID
    db.collection("forms").add({
        question: question,
        options: options,
        timeStart: timeStart,
        timeEnd: timeEnd,
        maxChoices: maxChoices,
        requireUniqueID: requireUniqueID,
        requireCaptcha: requireCaptcha
    })
    .then(function(docRef) {
        console.log("Document written with ID: ", docRef.id);
    })
    .catch(function(error) {
        console.error("Error adding document: ", error);
    });
});