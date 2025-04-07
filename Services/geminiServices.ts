// File: src/services/geminiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import User from '../models/User';

import Task from '../models/Task';
import Tutor from '../models/Tutor';
// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}


// Add this to your services directory, e.g., src/services/taskService.ts

/**
 * Fetches tasks for a specific user, optionally filtered by year and month
 * Can be used by both API routes and AI agent workflows
 */
export async function fetchUserTasks(
    userId: string,
    filters?: {
        year?: string;
        month?: string;
        day?: string;
        tutorId?: string;
        status?: 'completed' | 'pending' | 'overdue';
        limit?: number;
    }
) {
    try {
        if (!userId) {
            throw new Error('User ID is required');
        }

        // Build query object based on provided filters
        const query: any = { userId };

        if (filters?.year) query.year = filters.year;
        if (filters?.month) query.month = filters.month;
        if (filters?.day) query.day = filters.day;
        if (filters?.tutorId) query.tutorId = filters.tutorId;
        if (filters?.status) query.status = filters.status;

        // Create the query with pagination if limit is provided
        let taskQuery = Task.find(query)
            .populate({
                path: 'tutorId',
                select: 'studentId avatar name subject learningStyle'
            })
            .sort({ year: -1, month: -1, day: -1 }); // Sort by date descending

        if (filters?.limit) {
            taskQuery = taskQuery.limit(filters.limit);
        }

        const tasks = await taskQuery.exec();

        return {
            success: true,
            tasks,
            total: tasks.length
        };
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            tasks: [],
            total: 0
        };
    }
}

/**
 * Generates a student report based on task data
 */
export async function generateStudentReport(userId: string, tutorId?: string) {
    try {
        // Fetch all user tasks, with optional tutor filter
        const result = await fetchUserTasks(userId, {
            tutorId: tutorId,
            limit: 50 // Limit to recent tasks
        });

        if (!result.success) {
            throw new Error(result.error);
        }

        const tasks = result.tasks;

        // Calculate completion rates and other metrics
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((task: any) => task.status === 'completed').length;
        const pendingTasks = tasks.filter((task: any) => task.status === 'pending').length;
        const overdueTasks = tasks.filter((task: any) => task.status === 'overdue').length;

        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Group tasks by subject
        const tasksBySubject = tasks.reduce((acc: any, task: any) => {
            const subject = task.tutorId?.subject || 'Unknown';
            if (!acc[subject]) acc[subject] = [];
            acc[subject].push(task);
            return acc;
        }, {});

        // Generate report data
        const report = {
            summary: {
                totalTasks,
                completedTasks,
                pendingTasks,
                overdueTasks,
                completionRate: Math.round(completionRate * 10) / 10 // Round to 1 decimal place
            },
            bySubject: Object.entries(tasksBySubject).map(([subject, subjectTasks]: [string, any]) => {
                const subjectTotal = subjectTasks.length;
                const subjectCompleted = subjectTasks.filter((task: any) => task.status === 'completed').length;
                const subjectCompletionRate = subjectTotal > 0 ? (subjectCompleted / subjectTotal) * 100 : 0;

                return {
                    subject,
                    totalTasks: subjectTotal,
                    completedTasks: subjectCompleted,
                    completionRate: Math.round(subjectCompletionRate * 10) / 10,
                    recentTasks: subjectTasks.slice(0, 5).map((task: any) => ({
                        title: task.title,
                        status: task.status,
                        dueDate: `${task.year}-${task.month}-${task.day}`
                    }))
                };
            }),
            recentTasks: tasks.slice(0, 10).map((task: any) => ({
                title: task.title,
                subject: task?.tutorId?.subject || 'Unknown',
                status: task.status,
                dueDate: `${task.year}-${task.month}-${task.day}`
            }))
        };

        return {
            success: true,
            report
        };
    } catch (error) {
        console.error('Error generating student report:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}


class GeminiService {
    private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    private sessionCache: Map<string, any> = new Map();

    /**
     * Process a message with the Gemini API based on user and tutor information
     */
    async processMessage(message: string, userId: string, tutorId: string, role: 'student' | 'parent'): Promise<string> {
        try {
            // Get user and tutor data
            const user = await User.findById(userId);
            const tutor = await Tutor.findById(tutorId).populate('roadmap');

            if (!user || !tutor) {
                throw new Error('User or tutor not found');
            }

            const sessionKey = `${userId}-${tutorId}`;

            // Initialize chat or get from cache
            let chat = this.sessionCache.get(sessionKey);

            if (!chat) {
                const systemPrompt = this.createSystemPrompt(tutor, user, role);
                chat = this.model.startChat({
                    history: [
                        {
                            role: "user",
                            parts: [{ text: systemPrompt }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                    },
                });

                this.sessionCache.set(sessionKey, chat);
            }

            // Send user's actual message
            const result = await chat.sendMessage(message);
            const responseText = result.response.text();

            return responseText;
        } catch (error) {
            console.error('Error processing message with Gemini:', error);
            return "I'm sorry, I encountered an error while processing your request. Please try again later.";
        }
    }


    /**
     * Create system prompt based on tutor configuration and user data
     */
    private createSystemPrompt(tutor: any, user: any, role: 'student' | 'parent'): string {
        const {
            name,
            subject,
            personality,
            learningStyle,
            interests,
            pace,
            studentSummary,
            language
        } = tutor;

        let prompt = `
    You are ${name}, an AI tutor specialized in ${subject}. 
    Your personality style is ${personality}. 
    You prefer to teach using ${learningStyle} learning methods at a ${pace} pace.
    
    The student's interests include: ${interests?.join(', ') || 'various topics'}.
    
    
    Student details: ${user}
    
    Student Summary:
    ${studentSummary || 'No summary available yet. The student has not yet interacted enough for a detailed performance summary.'}
    `;

        // Add roadmap context
        if (tutor.roadmap) {
            prompt += `
                The student is currently following the "${tutor.roadmap}" roadmap. 
                This roadmap helps guide the student through a structured sequence of topics and tasks. 
                Make sure to personalize your responses based on their current position in this roadmap. 
                Offer task-based learning, revisions, and concept explanations aligned with this roadmap.
                `;
        } else {
            prompt += `
                ❗Note: The student has not uploaded their syllabus yet. 
                Because of this, no personalized roadmap has been generated.

                As their AI tutor, kindly ask the student to upload their syllabus to unlock a tailored learning path.
                You may say something like:
                "Hi! I noticed you haven’t uploaded your syllabus yet. Uploading it helps me create a personalized roadmap just for you, so I can guide your learning better. Would you like help with that?"
                `;
        }

        if (role === 'parent') {
            prompt += `
                You are speaking with the parent of your student. Be professional and informative about their child's learning progress.
                Format your responses to be clear and concise, focusing on student progress and areas for improvement.
                        `;
        } else {
            prompt += `
                You are speaking directly with your student. Adapt your teaching style to match their learning preferences.
                Format your responses in markdown to clearly present mathematical concepts, code, and other educational content.
                When explaining concepts, use examples that relate to the student's interests when possible.
                        `;
        }

        switch (personality) {
            case 'friendly':
                prompt += `Use a warm, encouraging tone. Be supportive and patient. Use emoticons occasionally to create a friendly atmosphere. `;
                break;
            case 'strict':
                prompt += `Be direct and focused on academic rigor. Push the student to excel and think critically. Focus on precision and accuracy. `;
                break;
            case 'witty':
                prompt += `Use humor and clever analogies to make learning more engaging. Be quick-witted but ensure the educational content remains clear. `;
                break;
            case 'default':
            default:
                prompt += `Maintain a balanced, professional tone that prioritizes clarity and helpfulness. `;
                break;
        }

        if (learningStyle === 'visual') {
            prompt += `
                Since the student is a visual learner:
                - Describe visual representations when explaining concepts
                - Suggest diagrams, charts, and visual aids
                - Use spatial relationships and visual metaphors
                - Reference colors, shapes, and patterns when relevant
                - Encourage the student to visualize concepts
                        `;
        } else if (learningStyle === 'auditory') {
            prompt += `
                Since the student is an auditory learner:
                - Use rhythmic patterns when appropriate
                - Suggest verbal repetition as a memory technique
                - Frame concepts in terms of sound and discussions
                - Emphasize spoken explanations over visual descriptions
                - Encourage the student to verbalize their understanding
                        `;
        }

        prompt += `
            Response Guidelines:
            - All responses should be in markdown format for better readability
            - For mathematical equations, use LaTeX syntax within markdown
            - Keep explanations appropriate for the student's level and learning pace (${pace})
            - Always be encouraging and consistent with your ${personality} personality
            - When appropriate, provide practice questions or exercises
            - If you don't know the answer, acknowledge it honestly
            - Respond in ${language || 'English'}
            
            **Important: If the user's message is general or not related to studies or the subject (${subject}), respond with a short and friendly reply. Avoid long responses for general chitchat or off-topic questions.**
                `;


        prompt += `
        ⚠️ Behavior Rule for Inappropriate Messages:
        
        If a student sends inappropriate, adult, or offensive content:
        - Respond immediately with a firm warning.
        - Craft a unique, creative response based on your tutor personality (do NOT reuse responses).
        - Make sure the tone reflects the personality:
            • Friendly: Kind but clearly disapproving, may use gentle humor.
            • Strict: Direct, serious, and firm.
            • Witty: Clever, sarcastic, or playfully scolding—without being mean.
            • Default: Neutral, professional, and to the point.
        
        🧠 Response Guidelines:
        - Clearly state that the behavior is unacceptable and will be reported to their parent.
        - Include a clever personality-aligned roast or remark if appropriate.
        - Keep language school-appropriate, no profanity or suggestiveness.
        - Do NOT continue the conversation unless it returns to a learning topic.
        - Always create a **fresh, original** response—do NOT repeat past responses.
        
        🔍 Example (Do not reuse, just for inspiration):
        - Friendly: "Whoa! Not the kind of chat we’re having here 😅. Let’s stay focused or I’ll have to tell your parent."
        - Strict: "That’s completely unacceptable. I will report this to your parent. Focus on your studies."
        - Witty: "Nice try, but I’m not your virtual valentine. Should I loop your parent in? 😏"
        - Default: "Inappropriate. I expected better. This will be reported if it continues."
        
        ✨ Your task:
        - Analyze the inappropriate input.
        - Generate a single, clear, personality-driven warning message.
        - Ensure it sounds natural, original, and fits the AI tutor's tone.
        `;





        return prompt;
    }


    /**
     * Clear a specific chat session from cache
     */
    clearChatSession(userId: string, tutorId: string): void {
        const sessionKey = `${userId}-${tutorId}`;
        this.sessionCache.delete(sessionKey);
    }

    /**
     * Clear all chat sessions from cache
     */
    clearAllSessions(): void {
        this.sessionCache.clear();
    }
}

export default new GeminiService();
