
// // Initialize Firebase
// const firebaseConfig = {
// };

// firebase.initializeApp(firebaseConfig);
// const auth = firebase.auth();
// // const firestore = firebase.firestore();
// const database = firebase.database(); //Realtime Db use krenge

let acceptSubmission = false;
let otp = null;
function sendOTP(enteredEmail) {
    otp = Math.floor(100000 + Math.random() * 900000);
    const emailBody = 'OTP: ' + otp;
    Email.send({
        SecureToken : "11cb963f-f8e0-416e-b62d-55c0f7c65bbd",
        To : enteredEmail,
        From : "shincha21321@gmail.com", //RN, only this email will work
        Subject : "POLLSAY Voting Session OTP",
        Body : emailBody
    }).then((val)=>{
        if(val == "OK"){
            alert("OTP Sent Successfully")
            acceptSubmission = true
            setTimeout(() => {
                acceptSubmission = false;
            }, 60 * 1000);
        }
        else{
            alert(val);
        }
    });
}

/*only allow certain email id's to vote*/
const emailInput = document.getElementById('email');
const sendOtpButton = document.getElementById('sendOtpButton');
const submitButton = document.getElementById('submitButton');

sendOtpButton.addEventListener('click', function () {
    const enteredEmail = emailInput.value;
    const emailPattern = /^(0[0-9]{2}|[1-9][0-9]{2})17702722_cse@vips\.edu$/;

    // Check if the entered email matches the pattern
    if (!emailPattern.test(enteredEmail)) {
        alert('Sorry! That email is not permitted in this voting session');
        emailInput.value = ''; // Clear the input
        emailInput.style.backgroundColor = "pink";
    }
    else{
        sendOTP(enteredEmail);
        // Display poll question code...
    }
});

submitButton.addEventListener('click', () => {
    if (acceptSubmission) {
        if(otp == document.getElementById('otp').value){
            alert('OTP Verified');
            // Display poll question code...
        }
        else{
            alert('Invalid OTP');
        }
    }
    else{
        alert('OTP Expired or Invalid');
    }
});

