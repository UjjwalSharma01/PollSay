
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
    const emailPattern = /^(00[0-9]|00[0-9]|060)17702722cse@vips\.edu$/;

    // Check if the entered email matches the pattern
    if (!emailPattern.test(enteredEmail)) {
        alert('Sorry! That email is not permitted in this voting session');
        emailInput.value = ''; // Clear the input
        emailInput.style.backgroundColor = "pink";
    }
    else{
        alert('Enter the OTP sent to your email address');

        /*Display Poll Question */
        let hero = document.getElementsByClassName("hero")[0].children[0].innerHTML = 
        `
            <h2 id="poll-question">Poll Question goes here</h2>
            <form id="poll-vote">
                <input type="radio" id="yes" name="vote" value="yes">
                <label for="yes">Yes</label><br>
                <input type="radio" id="no" name="vote" value="no">
                <label for="no">No</label>
            </form>
            <button id="submitButton" type="submit">Submit</button>
        `
    }
});
