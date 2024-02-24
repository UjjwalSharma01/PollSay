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

let submitButton2 = document.getElementById("submitButton2");
let poleCode = document.getElementById('poleCode');
let poleCodeInput = null;

submitButton2.addEventListener("click", function() {
    poleCodeInput = poleCode.value;
    let serverAddress = 'http://localhost:3000'; // Update this to your server address
    let url = `${serverAddress}/form/${poleCodeInput}`;
    window.open(url, '_blank');
});

submitButton.addEventListener('click', () => {
    if (acceptSubmission) {
        if(otp == document.getElementById('otp').value){
            alert('OTP Verified');
            // Display poll question code...
            submitButton2.style.display = 'block';
            poleCode.style.display = 'block';

            let x = document.getElementById('user-auth');
            x.querySelectorAll('*').forEach(element => {
                if (element.id !== 'poleCode' && element.id !== 'submitButton2') {
                    element.style.display = 'none';
                }
                else{
                    //...
                }
            });
        }
        else{
            alert('Invalid OTP');
        }
    }
    else{
        alert('OTP Expired or Invalid');
    }
});




