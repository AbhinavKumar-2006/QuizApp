# State Recovery on Refresh

The issue you discovered happens because the websocket event that sends the current question (`session:question`) is only broadcasted when the host clicks "Next" or "Start". If a user refreshes the page in the middle of a question, they miss this event and get stuck in a blank or "waiting" state. 

We need to implement **State Recovery** for both the Host and Participants so they can seamlessly rejoin a live question.

## Proposed Changes

### Backend - REST API (Host Recovery)
We will modify the `getSession` endpoint to bundle the active question's state if the quiz is currently running.

#### [MODIFY] sessionController.js
- In `getSession`, if `session.status === 'active'`, we will calculate and return an `activeState` object.
- This object will contain: `question`, `index`, `total` questions, `timeLimit`, and the current `answerCount`.

### Frontend - Host UI
The host needs to use that bundled state when the page first loads.

#### [MODIFY] HostSession.jsx
- Update the initial `sessionApi.get` `useEffect` hook.
- If `data.activeState` exists, inject all of those values directly into the React state (`currentQ`, `qIndex`, `answerCount`, etc.) and immediately transition the phase to `PHASE.QUESTION`.

### Backend - WebSockets (Participant Recovery)
Participants don't use the full REST API on load; they just establish a Socket.io connection. We will recover their state immediately after they join the socket room.

#### [MODIFY] participantHandlers.js
- In `participant:join`, if the session is `active`, we will fetch the current question.
- We will emit a `session:question` event *privately* to that specific reconnecting user.
- We will also check the `Response` database to see if they already answered this question before refreshing. If they did, we will also emit `participant:answer_result` to them.

### Frontend - Participant UI
The participant needs to handle the possibility of receiving an answer result right after joining.

#### [MODIFY] PlaySession.jsx
- Update the `participant:answer_result` socket listener to accept a `previouslySelected` ID.
- If received, instantly set the `selected` option and force the UI into `PHASE.ANSWERED`, bypassing the question screen so they safely return to the "Answer submitted! Waiting for host..." screen.

## Verification Plan
### Manual Verification
1. Start a quiz as a Host. Wait on a question. Refresh the Host page. Verify the active question and live timer/answer progress bar reappear.
2. Join as a Participant. While the question is active, refresh the Participant page. Verify the question reappears on screen.
3. Answer the question as a Participant. Refresh the page again. Verify it correctly returns to the "Answer submitted!" screen without letting them answer twice.
