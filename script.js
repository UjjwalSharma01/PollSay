
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
    else {
        // Generate a random OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        // Prepare the data to send
        const data = new FormData();
        data.append('from', 'Your Email Here'); // Replace with your email
        data.append('to', enteredEmail);
        data.append('subject', 'Your OTP for voting session');
        data.append('text', `Your OTP is ${otp}`);

        // Send the OTP using the Mailgun API
        fetch('https://api.mailgun.net/v3/sandbox469d82e0b23843b08be9bc65c82ca5bf.mailgun.org/messages', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa('api:key-d6ed35c0f0213116a52dda4e6759b7fd-408f32f3-69d34184')
            },
            body: data
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Queued. Thank you.') {
                alert('OTP has been sent to your email address');
            } else {
                alert('Failed to send OTP');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
}
);

// https://api.mailgun.net/v3/sandbox469d82e0b23843b08be9bc65c82ca5bf.mailgun.org
// d0b16b2c3c1e3ece3c1ab235b0832c69-408f32f3-7149e360