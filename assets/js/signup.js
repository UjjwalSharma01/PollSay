// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your web app's Firebase configuration
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

            // Ask the user if they want to create a form
            if (confirm('Do you want to create a form?')) {
                // If they confirm, redirect to form.html
                window.location.href = 'customize.html';
            } 
            
            // sochege
            // else {
            //     window.location.href = 'customize.html';
            // }
        })
        .catch((error) => {
            // There was an error logging in the user
            if (error.code === 'auth/user-not-found') {
                alert('Please signup first');
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
