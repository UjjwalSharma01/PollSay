// Initialize firebase
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// Import the functions you need from the SDKs you need
const firebaseConfig = {
  apiKey: "AIzaSyAxr-SPca9kxklClFxHYkYn0h4HOaX49Mo",
  authDomain: "hackathon-d9723.firebaseapp.com",
  projectId: "hackathon-d9723",
  storageBucket: "hackathon-d9723.appspot.com",
  messagingSenderId: "885132274630",
  appId: "1:885132274630:web:e0ec9087076c703235a0c7",
  measurementId: "G-BHPSWF6M12"
};

// Initialize Firebase

firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

// Initialize option counter
let optionCounter = 1;

document.getElementById('addOption').addEventListener('click', function() {
    var optionsContainer = document.getElementById('optionsContainer');
    
    // Create new label
    var newLabel = document.createElement('label');
    newLabel.textContent = "Enter Poll Option " + (++optionCounter) + ":";
    optionsContainer.appendChild(newLabel);
    
    // Create new input
    var newOption = document.createElement('input');
    newOption.type = 'text';
    newOption.name = 'options';
    newOption.required = true;
    optionsContainer.appendChild(newOption);
    
    // Create line break
    var lineBreak = document.createElement('br');
    optionsContainer.appendChild(lineBreak);
});

// Function to generate a random ID
function generateRandomId(length = 10) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

document.getElementById('pollForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Generate a random ID
    let id = generateRandomId();

    let question = document.getElementById('question').value;
    let options = Array.from(document.getElementsByName('options')).map(option => option.value);
    let timeStart = document.getElementById('timeStart').value;
    let timeEnd = document.getElementById('timeEnd').value;
    let maxChoices = document.getElementById('maxChoices').value;
    let requireUniqueID = document.getElementById('requireUniqueID').checked;
    let requireCaptcha = document.getElementById('requireCaptcha').checked;

    // Get the current user
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in.
            var uid = user.uid;
            var email = user.email; // Get the user's email

            // Add a new document with the generated ID
            db.collection("forms").doc(id).set({
                question: question,
                options: options,
                createdBy: uid,
                createdByEmail: email, // Save the user's email
                timeStart: firebase.firestore.Timestamp.fromDate(new Date(timeStart)),
                timeEnd: firebase.firestore.Timestamp.fromDate(new Date(timeEnd)),
                maxChoices: Number(maxChoices),
                requireUniqueID: requireUniqueID,
                requireCaptcha: requireCaptcha
            })
            .then(function() {
                console.log("Document written with ID: ", id);
                // Redirect to the new form
                let serverAddress = 'http://localhost:3000'; // Update this to your server address
                window.location.assign(`${serverAddress}/form/${id}`);
            })
            .catch(function(error) {
                console.error("Error adding document: ", error);
            });
        } else {
            // No user is signed in.
            // ...
            console.log("No user signed in");
        }
    });
});

function deleteAllForms() {
    db.collection('forms').get().then((snapshot) => {
        snapshot.forEach((doc) => {
            db.collection('forms').doc(doc.id).delete().then(() => {
                console.log("Document successfully deleted!");
            }).catch((error) => {
                console.error("Error removing document: ", error);
            });
        });
    }).catch((error) => {
        console.log("Error getting documents: ", error);
    });
}
// Never call this function --> made to clear the database rather than doing it manually
// deleteAllForms();

