import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
    userId: mongoose.Types.ObjectId;  // Reference to User
    title: string;
    description: string;
    estimated_time: string;
    status: "Pending" | "In Progress" | "Completed";
    year: string;
    month: string;
    day: string;
    time: string;
    quizMarks?: number;
    quizMarksOutOf?: number;
}

const taskSchema: Schema = new mongoose.Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true },
        tutorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tutor',
            required: true
        },
        description: { type: String, required: true },
        estimated_time: { type: String, required: true },
        status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
        year: { type: String, required: true },
        month: { type: String, required: true },
        day: { type: String, required: true },
        time: { type: String, required: true },
        quizMarks: { type: Number, required: false },
        quizMarksOutOf: { type: Number, required: false }
    },
    { timestamps: true }
);

// Indexing for fast queries
taskSchema.index({ userId: 1, year: 1, month: 1, day: 1 });

export default mongoose.model<ITask>('Task', taskSchema);
