import mongoose from "mongoose";

const medicalRecoredSchema = new mongoose.Schema({}, {timestamps: true})

export const MedicalRecored = mongoose.model("MedicalRecored", medicalRecoredSchema)