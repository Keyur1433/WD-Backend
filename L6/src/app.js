import express from "express"; // Import express module
import cors from "cors"; // Import cors module
import cookieParser from "cookie-parser"; // Import cookie-parser module

const app = express(); // Create an instance of Express application

// Use CORS middleware with provided options
app.use(cors({
    origin: process.env.CORS_ORIGIN, // Set origin from environment variable
    credentials: true // Allow credentials
}));

// Configurations
app.use(express.json({ limit: "16kb" })); // Parse JSON requests with a limit of 16kb
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // Parse URL-encoded requests with a limit of 16kb
app.use(express.static("public")); // Serve static files from the "public" directory

export { app }; // Export the Express application instance