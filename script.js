
// // Initialize Firebase
// const firebaseConfig = {
// };

// firebase.initializeApp(firebaseConfig);
// const auth = firebase.auth();
// // const firestore = firebase.firestore();
// const database = firebase.database(); //Realtime Db use krenge


/*only allow certain email id's to vote*/
const emailInput = document.getElementById('email');
const submitButton = document.getElementById('submitButton');

submitButton.addEventListener('click', function () {
    const enteredEmail = emailInput.value;
    const emailPattern = /^\d{2}17702722_cse@vips\.edu$/;

    // Check if the entered email matches the pattern
    if (!emailPattern.test(enteredEmail)) {
        alert('Sorry! That email is not permitted in this voting session');
        emailInput.value = ''; // Clear the input
        emailInput.style.backgroundColor = "pink";
    }
    else{
        alert('Enter the OTP sent to your email address');
        // Display poll question code...
    }
});

// function to send otp starts here

sendOtpButton.addEventListener('click', function () {
    const enteredEmail = emailInput.value;
    // fixed the error in the emailPattern
    const emailPattern = /^\d+17702722_cse@vips\.edu$/;
    // Check if the entered email matches the pattern
    if (!emailPattern.test(enteredEmail)) {
        alert('Sorry! That email is not permitted in this voting session');
        emailInput.value = ''; // Clear the input
        emailInput.style.backgroundColor = "pink";
    }
    else{
        alert('OTP has been sent to your email address');
        // Code to send OTP goes here
    }
});

// function to send otp ends here