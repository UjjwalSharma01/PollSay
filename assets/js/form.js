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



// Get the document ID from the URL
var id = window.location.pathname.split('/')[2];

// Get the form data from Firestore
db.collection('forms').doc(id).get()
    .then((doc) => {
        if (doc.exists) {
            var formData = doc.data();

            // Replace the placeholders in the HTML
            document.getElementById('question').innerText = formData.question;
            // Do the same for the other form fields...
        } else {
            console.log("No such document!");
        }
    }).catch((error) => {
        console.log("Error getting document:", error);
    });