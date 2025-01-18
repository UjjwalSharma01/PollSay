# PollSay Documentation

## Project Overview

PollSay is a web-based polling platform that offers a streamlined and customizable experience for creating and managing polls. Users can effortlessly generate polls with unique identifiers and various response options, such as 'yes', 'no', 'maybe' or other options that can be added dynamically by the form creator.

### Features

- **Real-time updates:** Our platform provides real-time updates of poll results, allowing users to monitor responses as they come in. We achieve this by leveraging Firebase's real-time database capabilities.
- **Access control:** To ensure poll integrity, we've implemented features that restrict voting access based on user email IDs and other constraints. This is achieved through Firebase's authentication services.
- **Timeframe control:** Users can set specific timeframes for their polls, giving them control over when voting can occur.
- **Email OTPs:** We've integrated SMTPJS for sending OTPs via email for user authentication, adding an extra layer of security to our application.

## Setup and Usage Instructions

### Prerequisites

- Node.js and npm installed on your machine.
- Firebase project set up with Firestore and Authentication enabled.
- SMTPJS account for sending OTPs via email.

### Installation

1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Run `npm install` to install the necessary dependencies.
4. Start the server by running `node server.js`.
5. Open your web browser and navigate to `http://localhost:3000` to view the application.

### Configuration

1. Create a Firebase project and enable Firestore and Authentication.
2. Download the Firebase Admin SDK service account key and place it in the project directory.
3. Update the Firebase configuration in `assets/js/customize.js` and `assets/js/signup.js` with your Firebase project details.
4. Set up SMTPJS for sending OTPs via email and update the configuration in `login.html`.

## API Documentation and Code Structure

### API Endpoints

- **GET /form/:id**: Fetches the form data from Firestore using the form ID.
- **POST /submit/:id**: Submits the selected option for the poll and updates the responses in Firestore.

### Code Structure

- **server.js**: Sets up the Express server and defines the API endpoints.
- **assets/js/customize.js**: Handles the creation and submission of polls.
- **assets/js/signup.js**: Manages user authentication and signup process.
- **public/formBuilder.html**: Provides the UI for creating and customizing polls.
- **public/index.html**: The main landing page of the application.

## User Guide and Contribution Guidelines

### User Guide

1. **Creating a Poll**: Navigate to the "Customize Polling Form" page, enter the poll question and options, and set the voting timeframe. Click "Create Poll" to generate the poll.
2. **Voting in a Poll**: Users can vote in a poll by entering their email and the poll code on the login page. They will receive an OTP via email for authentication.
3. **Viewing Poll Results**: Poll results are displayed in real-time on the poll page, with a pie chart showing the distribution of responses.

### Contribution Guidelines

1. Fork the repository and create a new branch for your feature or bug fix.
2. Write clear and concise commit messages.
3. Ensure your code follows the project's coding standards and conventions.
4. Submit a pull request with a detailed description of your changes.

## Security Measures and Scripts Documentation

### Security Measures

- **End-to-End Encryption**: All data transmitted between the client and server is encrypted using HTTPS.
- **Authentication**: Firebase Authentication is used to ensure that only authorized users can create and vote in polls.
- **Unique Identifiers**: Each poll is assigned a unique identifier to prevent unauthorized access.

### Scripts Documentation

- **customize.js**: Initializes Firebase, handles the creation of polls, and manages the submission of poll responses.
- **signup.js**: Manages user authentication, including signup, login, and password reset functionality.
- **formBuilder.js**: Provides the functionality for creating and customizing polls using a dynamic form builder.
- **app.js**: Initializes the particles.js library for the background animation on the login page.
