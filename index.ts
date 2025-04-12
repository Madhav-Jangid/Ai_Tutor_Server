require('dotenv').config();

import express from 'express';
import cors from 'cors';
import connectDB from './config/db';
import { createServer } from 'http';
import { Server } from 'socket.io';
import chatRoutes from './routes/chatRoutes';
import authRoutes from './routes/authRoutes';
import agentRoutes from './routes/roadmapRoutes';
import tutorRoutes from './routes/tutorRoutes';
import taskRoutes from './routes/taskRoutes';
import studyRoutes from './routes/studyRoutes';
import userRoutes from './routes/userRoutes';
import childrenRoutes from './routes/Parent/childrenRoutes';
import initSockets from './Sockets';
import { config } from './config';

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
    cors: {
        origin: config.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6
});

app.set('io', io);

app.use(cors());

app.use(express.json());

connectDB();

initSockets(io);


app.get('/', (req: any, res: any) => {
    res.send('Server is running');
});

app.get('/health', (req: any, res: any) => {
    res.status(200).send('OK');
});

app.use('/api/auth', authRoutes);
app.use('/api/ai-agent', agentRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/parent/children', childrenRoutes);


const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.clear();
    console.log(`Server running on port ${PORT}`);
});

export default app;
