import Message from './models/Message';
import Chat from './models/Chats';
import Tutor from './models/Tutor';
import { processWithAI } from './utils/processWithAI';
import type { Server } from 'socket.io';
import mongoose from 'mongoose';

const activeConnections = new Map();

export default function initSockets(io: Server) {
    io.on('connection', (socket: any) => {
        let currentRooms = new Set();

        socket.on('join-room', (roomId: string) => {
            if (typeof roomId !== 'string' || !roomId.trim()) {
                socket.emit('error', { message: 'Invalid room ID' });
                return;
            }

            socket.join(roomId);
            currentRooms.add(roomId);
            socket.to(roomId).emit('user-joined', { socketId: socket.id });
            socket.emit('room-joined', { roomId });
        });

        socket.on('leave-room', (roomId: string) => {
            if (typeof roomId === 'string' && roomId.trim()) {
                socket.leave(roomId);
                currentRooms.delete(roomId);
            }
        });

        socket.on('send-message', async (data: any) => {
            try {
                if (!data || typeof data !== 'object') {
                    socket.emit('error', { message: 'Invalid message data' });
                    return;
                }

                const { roomId, message, userId, tutorId, role, chatId } = data;

                if (!roomId || !message || !userId || !tutorId || !role) {
                    socket.emit('error', { message: 'Missing required fields' });
                    return;
                }

                // Find tutor first
                const tutor = await Tutor.findById(tutorId).populate('studentId');
                if (!tutor) {
                    socket.emit('error', { message: 'Tutor not found' });
                    return;
                }

                const studentId = tutor.studentId;
                const resolvedStudentId = role === 'parent' ? studentId : userId;

                // Find or create chat
                let chat: any = null;
                if (chatId) {
                    chat = await Chat.findById(chatId);
                }

                // If chat doesn't exist, create a new one
                if (!chat) {
                    chat = new Chat({
                        name: `${resolvedStudentId}-${tutorId}`,
                        userId,
                        studentId: resolvedStudentId,
                        tutorId,
                        messages: []
                    });
                    await chat.save();
                    
                    // Save correct reference in tutor model
                    if (role === 'parent' && !tutor.chatWithParent) {
                        await Tutor.findByIdAndUpdate(
                            tutorId,
                            { chatWithParent: chat._id },
                            { new: true }
                        );
                    } else if (role === 'student' && !tutor.chat) {
                        await Tutor.findByIdAndUpdate(
                            tutorId,
                            { chat: chat._id },
                            { new: true }
                        );
                    }
                    
                    // Emit chat-created event with chat ID
                    socket.emit('chat-created', { chatId: chat._id });
                }

                // Save user message
                const userMessage = new Message({
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

                // Broadcast user message to room
                io.to(roomId).emit('receive-message', {
                    _id: userMessage._id,
                    message: userMessage.content,
                    userId,
                    senderType: 'user',
                    timestamp: userMessage.createdAt,
                    chatId: chat._id
                });

                // If student or parent, generate AI response
                if (role === 'student' || role === 'parent') {
                    io.to(roomId).emit('tutor-typing', { tutorId, isTyping: true });

                    try {
                        // Convert ObjectId to string for AI processing
                        const chatIdString = chat._id.toString();
                        
                        const aiResponse = await processWithAI(
                            message, 
                            userId, 
                            tutorId, 
                            role, 
                            resolvedStudentId, 
                            chatIdString, 
                            io, 
                            roomId
                        );

                        // Create AI message with correct chatId
                        const aiMessage = new Message({
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

                        // Stop typing indicator
                        io.to(roomId).emit('tutor-typing', { tutorId, isTyping: false });

                        // Broadcast AI message with chatId
                        io.to(roomId).emit('receive-message', {
                            _id: aiMessage._id,
                            message: aiMessage.content,
                            userId: tutorId,
                            senderType: 'tutor',
                            timestamp: aiMessage.createdAt,
                            chatId: chat._id
                        });

                    } catch (aiError: any) {
                        io.to(roomId).emit('tutor-typing', { tutorId, isTyping: false });
                        io.to(roomId).emit('error', {
                            message: 'Failed to get AI response',
                            error: aiError.message
                        });
                    }
                }

            } catch (error: any) {
                socket.emit('error', {
                    message: 'Failed to process message',
                    error: error.message
                });
            }
        });

        socket.on('disconnect', () => {
            currentRooms.forEach(roomId => {
                socket.to(roomId).emit('user-left', { socketId: socket.id });
            });

            if (socket.userId) {
                activeConnections.delete(socket.userId);
            }
        });
    });

    process.on('SIGINT', () => {
        console.log('Shutting down server...');
        io.close(() => {
            console.log('Socket.IO server closed');
            process.exit(0);
        });
    });

    return io;
                  }
