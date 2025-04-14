import mongoose, { Document, Schema } from 'mongoose';

export interface ITutor extends Document {
    studentId: string;
    avatar: string;
    name: string;
    subject: string;
    personality: "friendly" | "strict" | "witty" | "default";
    learningStyle: "visual" | "auditory";
    interests: string[];
    pace: 'slow' | 'medium' | 'fast';
    studentSummary: string;
    roadmap: mongoose.Types.ObjectId;
    chat: mongoose.Types.ObjectId;
    chatWithParent: mongoose.Types.ObjectId;
    language: string;
    createdAt: Date;
}

const tutorSchema: Schema = new mongoose.Schema({
    studentId: { type: String, required: true },
    avatar: { type: String, required: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    studentSummary: { type: String, required: false },
    roadmap: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyPlan',
        required: false
    },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: false
    },
    chatWithParent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: false
    },
    personality: {
        type: String,
        enum: ['friendly', 'strict', 'witty', 'default'],
        default: 'default'
    },
    learningStyle: {
        type: String,
        enum: ['visual', 'auditory'],
        required: true
    },
    interests: [{ type: String }],
    pace: {
        type: String,
        enum: ['slow', 'medium', 'fast'],
        default: 'medium'
    },
    language: {
        type: String,
        default: 'English'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});


export default mongoose.model<ITutor>('Tutor', tutorSchema);