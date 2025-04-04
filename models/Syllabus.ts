import mongoose, { Document, Schema } from 'mongoose';

export interface ISyllabus extends Document {
    tutorId: string;
    topics: string[]; // e.g., ["Fractions", "Algebra"]
    createdAt: Date;
}

const syllabusSchema: Schema = new mongoose.Schema({
    tutorId: { type: Schema.Types.ObjectId, ref: 'Tutor', required: true },
    topics: [{ type: String, required: true }],
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ISyllabus>('Syllabus', syllabusSchema);