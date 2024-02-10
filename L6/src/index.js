// Method-1 to import "dotenv"
// require("dotenv").config({path: "./env"})

// Method-2 to import "dotenv"
import dotenv from "dotenv";
import connectDB from "../db/index.js";

//  Approach-2

// Method-2 to import "dotenv"
dotenv.config({
        path: "./env"
})

connectDB()


//  Approach-1
// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";

// Approach-1
/*
import express from "express";
const app = express()

        // IFFI
        (async () => {
                try {
                        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
                        // If "Express App" can not able to talk with server, then below line prints error
                        app.on("error", (error)=>{
                                console.log("ERROR", error);
                                throw error
                        })

                        // If "Express App" can talk with server, then it will listen
                        app.listen(process.env.PORT, ()=>{
                                console.log(`App is listenin on port ${process.env.PORT}`);
                        })

                } catch (error) {
                        console.log("ERROR:", error);
                        throw error
                }
        })()
 */