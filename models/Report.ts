import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
    studentId: string;
    roadmapId: string;
    tasksCompleted: number;
    totalTasks: number;
    quizScores: { quizId: string; score: number }[];
    generatedAt: Date;
}

const reportSchema: Schema = new mongoose.Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true },
    tasksCompleted: { type: Number, required: true },
    totalTasks: { type: Number, required: true },
    quizScores: [{
        quizId: { type: Schema.Types.ObjectId, ref: 'Quiz' },
        score: { type: Number }
    }],
    generatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IReport>('Report', reportSchema);