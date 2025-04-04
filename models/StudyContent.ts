import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: { type: [String], required: false },
    correct_answer: { type: String, required: false },
    explanation: { type: String, required: false }
});

const studyContentSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    subject: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    estimated_study_time: { type: mongoose.Schema.Types.Mixed, required: true }, // Supports both Number and String
    readme: { type: String, required: false }, // Stores dynamically generated README content
    quiz: { type: [quizSchema], required: false } // Keeps quizzes interactive
}, { timestamps: true });

export default mongoose.model("StudyContent", studyContentSchema);
