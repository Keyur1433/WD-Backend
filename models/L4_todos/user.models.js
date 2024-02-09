import mongoose from "mongoose";

// Making schema.
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },

        password: {
            type: String,
            required: true
        }

    }, {timestamps: true} // Here "timestamps" are "createdAt" and "updatedAt".
)

// Here, model name is "User" and this model is based on "userSchema". 
// When this model "User", will goes in database (mongoDB), at that time model name "User" will convert into "users" (all characters become lowercase and plural)
export const User = mongoose.model("User", userSchema)