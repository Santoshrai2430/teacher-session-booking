Teacher Session Booking API
A REST API for managing users, teacher sessions, bookings, and session completion. Built with Node.js, TypeScript, Express, MongoDB, and Mongoose.
Features
- Create users with required-field and email validation.
- Create sessions for existing teachers.
- Find available sessions for a UTC calendar day using a MongoDB aggregation pipeline.
- Book an available session for an existing user.
- Prevent duplicate/concurrent bookings with a conditional atomic database update.
- Mark booked sessions as completed and record completedAt.
- Retrieve a user's upcoming and completed sessions, including teacher details, using aggregation.
- Centralized error handling and environment-based configuration.
Tech stack
- Node.js 20+
- TypeScript
- Express.js
- MongoDB Atlas or local MongoDB
- Mongoose
- dotenv, Helmet, CORS, Morgan
Prerequisites
Install:
- Node.js 20 or later (includes npm)
- MongoDB locally, or a MongoDB Atlas cluster
- Git (optional, for cloning the repository)
Getting started
1. Install dependencies
npm install
2. Configure environment variables
Copy the example file and edit it:
cp .env.example .env
.env.example contains:
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/teacher_sessions
For MongoDB Atlas, replace MONGODB_URI with your Atlas connection string and the intended database name. Ensure your current IP address is allowed in Atlas Network Access and that the database user has appropriate access. If the password contains special characters, URL-encode them in the connection string.

Security: Never commit .env or publish database credentials. Keep .env local; .gitignore excludes it.
3. Start the development server
npm run dev
The API runs at http://localhost:3000 by default. Check the health endpoint:
GET http://localhost:3000/health
4. Build and run
npm run typecheck
npm run build
npm start
The TypeScript build output is written to dist/.
Database setup
The application creates the users and sessions collections as documents are written. The assignment does not include a teacher-creation endpoint, so create at least one teacher document in the teachers collection through MongoDB Atlas Data Explorer, MongoDB Compass, or the Mongo shell before creating a session.

Example teacher document:
{
  "fullName": "Rahul Sharma",
  "email": "rahul.teacher@example.com",
  "specialization": "Mathematics",
  "experience": 5
}
MongoDB will generate _id automatically. Copy that ID and use it as teacherId when creating a session. Mongoose timestamps are enabled on the models.
API reference
Base URL: http://localhost:3000

All request bodies below should use Content-Type: application/json. Replace example IDs with real MongoDB ObjectIds from your database.
1. Create a user
POST /users

Request:
{
  "fullName": "Amit Kumar",
  "email": "amit.kumar@example.com",
  "phone": "9876543210"
}
Success: 201 Created. The response contains the created user, including _id, createdAt, and updatedAt.

Validation includes required fields and a valid email format. Duplicate emails are rejected by the database's unique constraint and handled as an error.
2. Create a session
POST /sessions

Request:
{
  "teacherId": "TEACHER_OBJECT_ID",
  "startTime": "2026-10-25T10:00:00.000Z",
  "endTime": "2026-10-25T11:00:00.000Z"
}
Success: 201 Created. The teacher must exist, both date-time values must be valid, and endTime must be later than startTime. New sessions start with status: "AVAILABLE", userId: null, and completedAt: null.
3. Get available sessions for a date
GET /sessions/available?dateTimestamp=1792886400000

dateTimestamp is a Unix timestamp in milliseconds. The endpoint interprets it as a UTC calendar date and searches from the start of that day (inclusive) to the next day (exclusive).

Success: 200 OK. Returns the available sessions for that date, sorted by start time, with teacher details. This endpoint uses MongoDB aggregation stages including $match, $lookup, $unwind, $sort, and $project. Booked or completed sessions are excluded.
4. Book a session
POST /sessions/:id/book

Example: POST /sessions/SESSION_OBJECT_ID/book

Request:
{
  "userId": "USER_OBJECT_ID"
}
Success: 200 OK. The user and session must exist, and the session must currently be AVAILABLE. The booking update is conditional and atomic to prevent two requests from successfully booking the same session. A session that is already booked or completed cannot be booked again.
5. Complete a session
PATCH /sessions/:id/complete

Example: PATCH /sessions/SESSION_OBJECT_ID/complete

No request body is required. Only a BOOKED session can be completed. Success: 200 OK; the API changes the status to COMPLETED and sets completedAt.
6. Get a user's session history
GET /users/:id/sessions

Example: GET /users/USER_OBJECT_ID/sessions

Success: 200 OK. Returns two arrays:
- upcomingSessions: sessions with status: "BOOKED" and startTime at or after the current time.
- completedSessions: sessions with status: "COMPLETED".
Teacher name and specialization are included where the related teacher record exists. This endpoint uses a MongoDB aggregation pipeline with $lookup, $unwind, and $facet.
HTTP status codes
Status	Meaning
200 OK	Read or update succeeded
201 Created	User or session created
400 Bad Request	Invalid/missing input or malformed ObjectId
404 Not Found	Referenced user, teacher, session, or route not found
409 Conflict	Session is not available for booking, invalid state transition, or duplicate email (depending on error handler/database error mapping)
500 Internal Server Error	Unexpected server error


Error responses use a consistent JSON shape, for example:
{
  "success": false,
  "message": "Invalid user id"
}
Project structure
session-booking-api/
├── postman/
│   └── Teacher-Session-Booking.postman_collection.json
├── src/
│   ├── config/
│   │   └── db.ts
│   ├── controllers/
│   │   ├── sessionsController.ts
│   │   └── usersController.ts
│   ├── middleware/
│   │   └── errorHandler.ts
│   ├── models/
│   │   ├── Session.ts
│   │   ├── Teacher.ts
│   │   └── User.ts
│   ├── routes/
│   │   ├── sessionsRoutes.ts
│   │   └── usersRoutes.ts
│   ├── utils/
│   │   ├── asyncHandler.ts
│   │   └── HttpError.ts
│   ├── app.ts
│   └── server.ts
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
Testing with Postman or Hoppscotch
The repository includes postman/Teacher-Session-Booking.postman_collection.json.
1. Import the collection into Postman, or import its JSON into Hoppscotch if supported by your workspace version.
2. Set the base URL to http://localhost:3000.
3. Create a user and copy the returned user _id.
4. Insert a teacher document in MongoDB and copy its _id.
5. Create a session, then test available-session search and booking.
6. Try booking the same session again; the second attempt should be rejected.
7. Complete the booked session and retrieve the user's session history.
Useful edge cases to test: missing user fields, malformed IDs, invalid timestamps, endTime earlier than or equal to startTime, booking an already-booked session, and completing a session that is not booked.
Notes and assumptions
- API timestamps are stored/returned as ISO date-time values; available-session date filtering uses UTC day boundaries.
- Upcoming history is based on BOOKED status and a start time that has not passed. A booked session whose start time is in the past will not be listed as upcoming.
- Completion currently requires the session to be BOOKED; it does not independently enforce that the scheduled end time has passed.
- There is no public teacher-creation API because it is not part of the specified endpoint list.
