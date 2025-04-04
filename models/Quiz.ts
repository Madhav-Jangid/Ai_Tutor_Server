import mongoose, { Document, Schema } from 'mongoose';

export interface IQuiz extends Document {
    taskId?: string; // Optional for task quizzes, null for final quiz
    roadmapId: string; // For final quiz
    questions: { question: string; options: string[]; correctAnswer: string }[];
    score: number;
    completedAt?: Date;
}

const quizSchema: Schema = new mongoose.Schema({
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true },
    questions: [{
        question: { type: String, required: true },
        options: [{ type: String }],
        correctAnswer: { type: String, required: true }
    }],
    score: { type: Number },
    completedAt: { type: Date }
});

export default mongoose.model<IQuiz>('Quiz', quizSchema);