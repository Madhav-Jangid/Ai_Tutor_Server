import Message from './models/Message';
import Chat from './models/Chats';
import Tutor from './models/Tutor';
import { processWithAI } from './utils/processWithAI';
import type { Server } from 'socket.io';

const activeConnections = new Map();

export default function initSockets(io: Server) {
    io.on('connection', (socket: any) => {
        let currentRooms = new Set();
        
        // Store userId for this connection if provided
        socket.on('register-user', (userId: string) => {
            if (userId) {
                socket.userId = userId;
                activeConnections.set(userId, socket.id);
            }
        });

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
                socket.emit('room-left', { roomId });
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

                // Start a transaction or series of atomic operations
                let chat;
                let newChatCreated = false;
                
                try {
                    const tutor = await Tutor.findById(tutorId).populate('studentId');
                    if (!tutor) {
                        socket.emit('error', { message: 'Tutor not found' });
                        return;
                    }

                    const studentId = tutor.studentId;
                    const resolvedStudentId = role === 'parent' ? studentId : userId;
                    
                    // First try to find the chat
                    if (chatId) {
                        chat = await Chat.findById(chatId);
                    }
                    
                    // If no chat found or no chatId provided, create a new one
                    if (!chat) {
                        chat = new Chat({
                            name: `${resolvedStudentId}-${tutorId}`,
                            userId,
                            studentId: resolvedStudentId,
                            tutorId,
                            messages: []
                        });
                        
                        await chat.save();
                        newChatCreated = true;
                        
                        // Update tutor with chat reference
                        if (role === 'parent') {
                            await Tutor.findByIdAndUpdate(
                                tutorId,
                                { chatWithParent: chat._id },
                                { new: true }
                            );
                        } else if (role === 'student') {
                            await Tutor.findByIdAndUpdate(
                                tutorId,
                                { chat: chat._id },
                                { new: true }
                            );
                        }
                        
                        // Emit event that new chat was created
                        socket.emit('chat-created', { 
                            chatId: chat._id,
                            name: chat.name,
                            userId: chat.userId,
                            studentId: chat.studentId,
                            tutorId: chat.tutorId,
                            createdAt: chat.createdAt
                        });
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
                    
                    // Broadcast the user message to everyone in the room
                    io.to(roomId).emit('receive-message', {
                        _id: userMessage._id,
                        message: userMessage.content,
                        userId,
                        senderType: 'user',
                        timestamp: userMessage.createdAt,
                        chatId: chat._id,
                        newChat: newChatCreated
                    });
                    
                    // If message is from student or parent, generate AI response
                    if (role === 'student' || role === 'parent') {
                        // Show typing indicator
                        io.to(roomId).emit('tutor-typing', { tutorId, isTyping: true });
                        
                        try {
                            const aiResponse = await processWithAI(
                                message, 
                                userId, 
                                tutorId, 
                                role, 
                                resolvedStudentId, 
                                chat._id.toString(), 
                                io, 
                                roomId
                            );
                            
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
                            
                            // Stop typing indicator
                            io.to(roomId).emit('tutor-typing', { tutorId, isTyping: false });
                            
                            // Broadcast AI message to everyone in the room
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
                } catch (dbError: any) {
                    socket.emit('error', {
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                }
                
            } catch (error: any) {
                socket.emit('error', {
                    message: 'Failed to process message',
                    error: error.message
                });
            }
        });

        // Add heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
            socket.emit('heartbeat');
        }, 30000); // Every 30 seconds

        socket.on('disconnect', () => {
            clearInterval(heartbeatInterval);
            
            // Notify all rooms this user has left
            currentRooms.forEach(roomId => {
                socket.to(roomId).emit('user-left', { socketId: socket.id });
            });
            
            // Clean up active connections map
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
