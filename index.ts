// File: src/server.ts
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db';
import { createServer } from 'http';
import { Server } from 'socket.io';
import chatRoutes from './routes/chatRoutes';
import authRoutes from './routes/authRoutes';
import roadmapRoutes from './routes/roadmapRoutes';
import tutorRoutes from './routes/tutorRoutes';
import taskRoutes from './routes/taskRoutes';
import studyRoutes from './routes/studyRoutes';
import userRoutes from './routes/userRoutes';
import geminiService from './Services/geminiServices';
import Message from './models/Message';
import Chat from './models/Chats';
import User from './models/User';
import Tutor from './models/Tutor';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.IO with more explicit configuration
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000, // Close connection after 60s of inactivity
    maxHttpBufferSize: 1e6 // 1MB max message size
});

app.use(cors());
app.use(express.json());

connectDB();

app.get('/', (req, res) => {
  res.send('Server is running');
});        

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});


app.use('/api/auth', authRoutes);
app.use('/api/ai-agent', roadmapRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chats', chatRoutes);

// Track active socket connections by user ID
const activeConnections = new Map();

io.on('connection', (socket: any) => {
    console.log('User connected:', socket.id);
    let currentRooms = new Set();

    // Authenticate socket connection (optional but recommended)
    // socket.on('authenticate', (token) => {
    // Implement token validation here
    // On successful auth, you could associate the socket with the user
    // Example: socket.userId = decodedToken.userId;
    // });

    socket.on('join-room', (roomId: string) => {
        if (typeof roomId !== 'string' || !roomId.trim()) {
            socket.emit('error', { message: 'Invalid room ID' });
            return;
        }

        socket.join(roomId);
        currentRooms.add(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);

        // Notify room that user has joined
        socket.to(roomId).emit('user-joined', { socketId: socket.id });
    });

    socket.on('leave-room', ((roomId: string) => {
        if (typeof roomId === 'string' && roomId.trim()) {
            socket.leave(roomId);
            currentRooms.delete(roomId);
            console.log(`User ${socket.id} left room: ${roomId}`);
        }
    }));

    socket.on('send-message', async (data: any) => {
        try {
            // Input validation
            if (!data || typeof data !== 'object') {
                socket.emit('error', { message: 'Invalid message data' });
                return;
            }

            const { roomId, message, userId, tutorId, role, chatId } = data;

            if (!roomId || !message || !userId || !tutorId || !role) {
                socket.emit('error', { message: 'Missing required fields' });
                return;
            }

            console.log('Received message:', { roomId, userId, tutorId, role });

            // Find existing chat or create new one
            let chat = await Chat.findById(chatId);

            if (!chat) {
                chat = new Chat({
                    name: `${userId}-${tutorId}`,
                    userId,
                    tutorId,
                    messages: []
                });
                await chat.save();
                console.log(`Created new chat with ID: ${chat._id}`);
            }

            // Create and save user message
            const userMessage: any = new Message({
                chatId: chat._id,
                senderId: userId,
                senderType: 'user',
                content: message,
            });

            await userMessage.save();

            // Update chat with new message
            chat.messages.push(userMessage._id);
            chat.updatedAt = new Date();
            await chat.save();

            // Emit the message to everyone in the room including sender for confirmation
            // io.to(roomId).emit('receive-message', {
            //     _id: userMessage._id,
            //     message: userMessage.content,
            //     userId,
            //     senderType: 'user',
            //     timestamp: userMessage.createdAt,
            // });

            // Handle AI response for student or parent messages
            if (role === 'student' || role === 'parent') {
                // Signal that tutor is typing
                io.to(roomId).emit('tutor-typing', { tutorId, isTyping: true });

                try {
                    // Get AI response
                    const aiResponse = await processWithAI(message, userId, tutorId, role);

                    // Create and save AI message
                    const aiMessage: any = new Message({
                        chatId: chat._id,
                        senderId: tutorId,
                        senderType: 'tutor',
                        content: aiResponse,
                    });

                    await aiMessage.save();

                    // Update chat with AI message
                    chat.messages.push(aiMessage._id);
                    chat.updatedAt = new Date();
                    await chat.save();

                    // Signal that tutor is no longer typing

                    // Emit AI response to room

                    const tutor = await Tutor.findById(tutorId);

                    if (tutor && !tutor.chat) {
                        await Tutor.findByIdAndUpdate(
                            tutorId,
                            { chat: chat._id },
                            { new: true }
                        );
                    }


                    io.to(roomId).emit('tutor-typing', { tutorId, isTyping: false });

                    io.to(roomId).emit('receive-message', {
                        _id: aiMessage._id,
                        message: aiMessage.content,
                        userId: tutorId,
                        senderType: 'tutor',
                        timestamp: aiMessage.createdAt,
                    });

                    // Update tutor's chat reference
                } catch (aiError: any) {
                    console.error('Error processing AI response:', aiError);
                    io.to(roomId).emit('tutor-typing', { tutorId, isTyping: false });
                    io.to(roomId).emit('error', {
                        message: 'Failed to get AI response',
                        error: aiError.message
                    });
                }
            }
        } catch (error: any) {
            console.error('Error processing message:', error);
            socket.emit('error', {
                message: 'Failed to process message',
                error: error.message
            });
        }
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // Clean up rooms
        currentRooms.forEach(roomId => {
            socket.to(roomId).emit('user-left', { socketId: socket.id });
        });

        // Remove from active connections if tracked
        if (socket.userId) {
            activeConnections.delete(socket.userId);
        }
    });
});

async function processWithAI(
    message: string,
    userId: string,
    tutorId: string,
    role: 'student' | 'parent'
): Promise<string> {
    try {
        // Validate inputs
        if (!message || typeof message !== 'string') {
            throw new Error('Invalid message');
        }

        if (!userId || !tutorId) {
            throw new Error('Missing user or tutor ID');
        }

        // Validate user and tutor existence
        const [user, tutor] = await Promise.all([
            User.findById(userId),
            Tutor.findById(tutorId)
        ]);

        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        if (!tutor) {
            throw new Error(`Tutor not found: ${tutorId}`);
        }

        // Ensure the role is valid
        if (role !== 'student' && role !== 'parent') {
            throw new Error(`Invalid role: ${role}`);
        }

        // Process message with AI service
        const aiResponse = await geminiService.processMessage(
            message,
            userId,
            tutorId,
            role
        );

        return aiResponse || "I don't have a response at this moment.";
    } catch (error) {
        console.error('Error in processWithAI:', error);
        return "Sorry, I couldn't process your message. Please try again later.";
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    io.close(() => {
        console.log('Socket.IO server closed');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.clear();
    console.log(`Server running on port ${PORT}`);
});

export default app;
