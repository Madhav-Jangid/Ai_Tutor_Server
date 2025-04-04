import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import roadmapRoutes from './routes/roadmapRoutes';
import tutorRoutes from './routes/tutorRoutes';
import taskRoutes from './routes/taskRoutes';
import studyRoutes from './routes/studyRoutes';
import userRoutes from './routes/userRoutes';
import './utils/streakReset';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai-agent', roadmapRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/user', userRoutes);





const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.clear();
    console.log(`Server running on port ${PORT}`)
}
); 