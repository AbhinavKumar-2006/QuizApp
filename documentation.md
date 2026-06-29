#to login
https://quizapp-ccr6.onrender.com/api/auth/login
{
    "email": "test1@gmail.com",
    "password": "12345678"
}

#to get all quizzes by a user
https://quizapp-ccr6.onrender.com/api/quizzes


When does the Host get a Socket ID?
The host gets a socket connection as soon as they enter the Waiting Room (Lobby).

The host clicks "Go Live" or "Open Session".
They are redirected to the /sessions/:sessionId/host page (the HostSession component).
The page fetches the session details from the API. As soon as that succeeds, the useSocket hook runs.
The host is now connected via Socket.io (getting a Socket ID) and sits in the lobby waiting for players. They do not have to wait until they click "Start Quiz".



When does the Participant get a Socket ID?
The participant gets a socket connection right after they enter their nickname.

The user goes to /join and enters a join code.
They enter a nickname and click Join.
The app redirects them to /play/:sessionId (the PlaySession component).
The moment that page loads, the useSocket hook runs.
The participant connects via Socket.io (getting a Socket ID), automatically fires the participant:join event, and appears on the Host's waiting room screen.




isConnected becomes false when user becomes ofline  -> build in socket.on('disconnect')




So here is the exact flow for the final question:

The host is on the last question (nextIndex is now equal to questions.length).
They click "Show Final Results 🏆".
The frontend emits host:next.
Your server-side code catches it, sees nextIndex >= questions.length, marks the session as ended, builds the final leaderboard, and broadcasts session:ended.
The frontend catches session:ended and changes the phase to PHASE.ENDED, displaying the final podium screen!