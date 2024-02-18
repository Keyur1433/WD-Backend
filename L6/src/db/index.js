import mongoose from "mongoose"; // Importing mongoose library for MongoDB connection
import { DB_NAME } from "../constants.js"; // Importing database name constant

// Function to connect to MongoDB database
const connectDB = async () => {
    try {
        // Connect to MongoDB using Mongoose
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        
        // Log successful connection
        console.log(`\n MongoDB Connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        // Log connection error and exit process if connection fails
        console.log("MONGODB connection error", error);
        process.exit(1);
    }
}

export default connectDB; // Export connectDB function for use in other modules
