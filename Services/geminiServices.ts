import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import User from '../models/User';
import Tutor from '../models/Tutor';
import { config } from '../config';
import { createSystemPromptForChat } from '../utils/Prompts/SystemPromptForChat';
import { fetchUserTasks } from '../utils/fetchUserTasks';

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

const chatSchema = {
    description: "AI tutor response schema",
    type: SchemaType.OBJECT,
    properties: {
        message: {
            type: SchemaType.STRING,
            description: "Your normal conversational message to the user in markdown format.",
            nullable: false,
        },
        requireTools: {
            description: "Specifies if tools are needed to fetch user data.",
            type: SchemaType.OBJECT,
            properties: {
                isAccessToToolsRequired: {
                    type: SchemaType.BOOLEAN,
                    description: "True if access to tools is required.",
                    nullable: false,
                },
                getDailyTasks: {
                    type: SchemaType.BOOLEAN,
                    description: "True if daily tasks of the user are needed.",
                    nullable: true,
                },
                getAllTaskOfRoadmap: {
                    type: SchemaType.BOOLEAN,
                    description: "True if all tasks of the user's roadmap are needed.",
                    nullable: true,
                }
            },
            required: ["isAccessToToolsRequired"],
        },
    },
    required: ["message", "requireTools"],
};

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}


class GeminiService {
    private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    private sessionCache: Map<string, any> = new Map();

    async processMessage(message: string, userId: string, tutorId: string, role: 'student' | 'parent') {
        try {
            const user = await User.findById(userId);
            const tutor = await Tutor.findById(tutorId).populate({ path: 'roadmap' });

            if (!user || !tutor) throw new Error('User or tutor not found');

            const sessionKey = `${userId}-${tutorId}`;
            let chat = this.sessionCache.get(sessionKey);

            if (!chat) {
                const systemPrompt = createSystemPromptForChat(tutor, user, role);
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

            const result = await chat.sendMessage(message, {
                tools: [{
                    functionDeclarations: [{
                        name: "getTaskData",
                        description: "Get task data for the student",
                        parameters: chatSchema
                    }]
                }]
            });

            let responseData;
            try {
                if (result.response.functionCalls && result.response.functionCalls.length > 0) {
                    const functionCall = result.response.functionCalls[0];
                    if (functionCall.name === "getTaskData") {
                        responseData = JSON.parse(functionCall.args);
                    } else {
                        responseData = {
                            message: result.response.text(),
                            requireTools: { isAccessToToolsRequired: false }
                        };
                    }
                } else {
                    responseData = {
                        message: result.response.text(),
                        requireTools: { isAccessToToolsRequired: false }
                    };
                }
            } catch (e) {
                console.error("Error parsing response:", e);
                responseData = {
                    message: result.response.text(),
                    requireTools: { isAccessToToolsRequired: false }
                };
            }

            const { message: responseMessage, requireTools } = responseData;

            if (requireTools?.isAccessToToolsRequired) {
                let toolResponse = "";

                if (requireTools.getDailyTasks) {
                    const today = new Date();
                    const year = today.getFullYear().toString();
                    const month = (today.getMonth() + 1).toString().padStart(2, '0');
                    const day = today.getDate().toString().padStart(2, '0');

                    const taskResult = await fetchUserTasks(userId, { tutorId, year, month, day });
                    toolResponse += `## 📅 Your Tasks for Today:\n`;
                    toolResponse += taskResult.tasks.length > 0
                        ? taskResult.tasks.map((task: any) => `- **${task.title}** (${task.status})`).join('\n')
                        : "No tasks found for today.\n";
                }

                if (requireTools.getAllTaskOfRoadmap && tutor.roadmap) {
                    const taskResult = await fetchUserTasks(userId, { tutorId });
                    toolResponse += `\n## 🗺️ All Tasks from Your Roadmap:\n`;
                    toolResponse += taskResult.tasks.length > 0
                        ? taskResult.tasks.map((task: any) => `- **${task.title}** (${task.status})`).join('\n')
                        : "No roadmap tasks found.\n";
                }

                const followUpResult = await chat.sendMessage(toolResponse);
                return followUpResult.response.text();
            }

            return responseMessage;

        } catch (error) {
            console.error('Error processing message with Gemini:', error);
            return "I'm sorry, I encountered an error while processing your request. Please try again later.";
        }
    }

    clearChatSession(userId: string, tutorId: string): void {
        const sessionKey = `${userId}-${tutorId}`;
        this.sessionCache.delete(sessionKey);
    }

    clearAllSessions(): void {
        this.sessionCache.clear();
    }
}

export default new GeminiService();