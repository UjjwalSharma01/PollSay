// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyD1E7L8HTG4pz9YwU-uH0Ukc1OAMmSiBXA",
    authDomain: "pollsay.firebaseapp.com",
    projectId: "pollsay",
    storageBucket: "pollsay.appspot.com",
    messagingSenderId: "512729911469",
    appId: "1:512729911469:web:f7b74a38449401dd767624",
    measurementId: "G-X6DY3KMLWK"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Signup
document.getElementById('signup-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // The user has been signed up
            const user = userCredential.user;
            console.log('User signed up:', user);
            alert('Signup successful, please login');

            // Store the user's email in local storage
            localStorage.setItem("userEmail", user.email);
        })
        .catch((error) => {
            // There was an error signing up the user
            if (error.code === 'auth/email-already-in-use') {
                alert('User already exists, please login');
            } else {
                console.error('Error signing up:', error);
            }
        });
});

// Login
document.getElementById('login-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // The user has been logged in
            const user = userCredential.user;
            console.log('User logged in:', user);
            alert('Logged in successfully');

            // Store the user's email in local storage
            localStorage.setItem("userEmail", user.email);

            // Ask the user if they want to create a form
            if (confirm('Do you want to create a form?')) {
                // If they confirm, redirect to form.html
                window.location.href = 'customize.html';
            } 
        })
        .catch((error) => {
            // There was an error logging in the user
            if (error.code === 'auth/user-not-found') {
                alert('No user found with this email. Please signup first.');
            } else if (error.code === 'auth/wrong-password') {
                alert('Incorrect password. Please try again.');
            } else if (error.code === 'auth/invalid-credential') {
                alert('Invalid credentials. Please check your email and password.');
            } else {
                console.error('Error logging in:', error);
            }
        });
});

// Forgot password
document.getElementById('forgot-password').addEventListener('click', (event) => {
    event.preventDefault();

    const email = prompt('Please enter your email:');

    if (email) {
        sendPasswordResetEmail(auth, email)
            .then(() => {
                // Password reset email sent!
                alert('Password reset email sent!');
            })
            .catch((error) => {
                // There was an error sending the password reset email
                console.error('Error sending password reset email:', error);
            });
    } else {
        alert('Please enter your email.');
    }
});


// Sign in using google
// Create a new instance of GoogleAuthProvider
const provider = new GoogleAuthProvider();

document.getElementById('google-login').addEventListener('click', (event) => {
    event.preventDefault();

    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            // The signed-in user info
            const user = result.user;
            console.log('User signed in:', user);
            alert('Logged in successfully');

            // Ask the user if they want to create a form
            if (confirm('Do you want to create a form?')) {
                // If they confirm, redirect to form.html
                window.location.href = 'customize.html';
            } else {
                alert("You're logged in as " + user.displayName);
            }
        }).catch((error) => {
            // Handle errors
            console.error('Error signing in:', error);
        });
});



// -------------------------DANGER ZONE -------------------------
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://pollsay.firebaseio.com'
});

function deleteAllUsers(nextPageToken) {
    // List batch of users, 1000 at a time.
    admin.auth().listUsers(1000, nextPageToken)
        .then((listUsersResult) => {
            listUsersResult.users.forEach((userRecord) => {
                admin.auth().deleteUser(userRecord.uid);
            });
            if (listUsersResult.pageToken) {
                // List next batch of users.
                deleteAllUsers(listUsersResult.pageToken)
            }
        })
        .catch((error) => {
            console.log('Error listing users:', error);
        });
}
// Start listing users from the beginning, 1000 at a time.
// deleteAllUsers();
