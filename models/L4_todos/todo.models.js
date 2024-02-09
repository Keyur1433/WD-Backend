import mongoose from "mongoose";

const toDoSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: true,
        },
        complete: {
            type: Boolean,
            default: false
        },
        // "createdBy" field is created by "User", which is present in "user.models.js" file.
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        subToDos:[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref:"subToDo"
            }
        ], // Array of sub-ToDos
    }, { timestamps: true }
)

export const ToDo = mongoose.model("ToDo", toDoSchema)