import mongoose, { Document, Schema } from 'mongoose';

export interface IAssessment extends Document {
    tutorId: string;
    questions: { question: string; answer: string; correct: boolean }[];
    score: number;
    completedAt: Date;
}

const assessmentSchema: Schema = new mongoose.Schema({
    tutorId: { type: Schema.Types.ObjectId, ref: 'Tutor', required: true },
    questions: [{
        question: { type: String, required: true },
        answer: { type: String, required: true },
        correct: { type: Boolean, required: true }
    }],
    score: { type: Number, required: true }, // e.g., 8/10
    completedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IAssessment>('Assessment', assessmentSchema);