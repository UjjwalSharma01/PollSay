# PollSay

PollSay is a web-based polling platform that offers a streamlined and customizable experience for creating and managing polls. Users can effortlessly generate polls with unique identifiers and various response options, such as 'yes', 'no', 'maybe' or other options that can be added dynamically by the form creator.

## Features

- **Real-time updates:** Our platform provides real-time updates of poll results, allowing users to monitor responses as they come in. We achieve this by leveraging Firebase's real-time database capabilities.
  
- **Access control:** To ensure poll integrity, we've implemented features that restrict voting access based on user email IDs and other constraints. This is achieved through Firebase's authentication services.
  
- **Timeframe control:** Users can set specific timeframes for their polls, giving them control over when voting can occur.
  
- **Email OTPs:** We've integrated SMTPJS for sending OTPs via email for user authentication, adding an extra layer of security to our application.

## Tech Stack

Our application is built with the following tech stack:

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Express.js
- **Database and authentication** - Firebase

We use Express.js to set up our server and define routes for handling HTTP requests.

## How to Use

1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Run `npm install` to install the necessary dependencies.
4. Start the server by running `node server.js`.
5. Open your web browser and navigate to `http://localhost:3000` to view the application.

## Future Enhancements

Future enhancements may include:

- Additional security measures, such as captcha verification and unique identifiers for voters.
- Dynamic addition of poll options for increased flexibility.

## Contact

If you have any questions or feedback, please feel free to contact us. We'd love to hear from you!
