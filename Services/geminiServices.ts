import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import User from '../models/User';
import Tutor from '../models/Tutor';
import { config } from '../config';
import { createSystemPromptForChat } from '../utils/Prompts/SystemPromptForChat';
import { fetchUserTasks } from '../utils/fetchUserTasks';
import { getDailyTasks } from './helpers/getDailyTaks';
import Message from '../models/Message';
// import { io } from '../index';
import Chats from '../models/Chats';
import StudyPlan from '../models/Roadmap';



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
                getUsersTasks: {
                    type: SchemaType.BOOLEAN,
                    description: "True if tasks of the user are needed.",
                    nullable: true,
                },
                getUsersRoadmap: {
                    type: SchemaType.BOOLEAN,
                    description: "True if user's roadmap is needed.",
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


const formatResponse = async (context: string) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: context }] }]
    });
    return result.response.text();
};


const doTheRest = async (data: any) => {

}


class GeminiService {
    private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    private sessionCache: Map<string, any> = new Map();

    async processMessage(message: string, userId: string, tutorId: string, role: 'student' | 'parent', chatId?: string, io?: any, roomId?: string) {
        try {
            const user = await User.findById(userId);
            const tutor = await Tutor.findById(tutorId).populate({ path: 'roadmap' });

            if (!user || !tutor) throw new Error('User or tutor not found');

            const sessionKey = `${userId}-${tutorId}`;
            let chat = this.sessionCache.get(sessionKey);

            if (!chat) {
                const systemPrompt = await createSystemPromptForChat(tutor, user, role);

                const model = genAI.getGenerativeModel({
                    model: "gemini-2.0-flash",
                    systemInstruction: systemPrompt,
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
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
                                        getUsersTasks: {
                                            type: SchemaType.BOOLEAN,
                                            description: "True if tasks of the user are needed.",
                                            nullable: true,
                                        },
                                        getUsersRoadmap: {
                                            type: SchemaType.BOOLEAN,
                                            description: "True if user's roadmap is needed.",
                                            nullable: true,
                                        }
                                    },
                                    required: ["isAccessToToolsRequired"],
                                },
                            },
                            required: ["message", "requireTools"],
                        },
                    },
                });

                chat = model.startChat({
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

            const result = await chat.sendMessage(message);
            const rawText = result.response.text().trim();



            let cleanJson = rawText;
            if (rawText.includes("```json")) {
                cleanJson = rawText.replace(/```json\s*|\s*```/g, '');
            }
            let messageFromAi = JSON.parse(cleanJson);




            const children = await User.findById(tutor?.studentId!);

            if (messageFromAi.requireTools.isAccessToToolsRequired === true && children) {
                if (messageFromAi.requireTools.getUsersTasks === true) {
                    const data = await getDailyTasks(children?.id! ? children?.id! : children?._id!, tutorId,);


                    const currentDate = new Date();
                    const formattedDate = currentDate.toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'full',
                        timeStyle: 'short'
                    });

                    let tempPrompt = `The ${role === 'student' ? 'user' : 'parent of child'} has asked for ${message} and Here are the details get only relevent information form this and respond only in markdown format.
                        

                        ${role === 'parent' && 'be respectfull with the parent'}

                         Current Date & Time Information:
    The current date and time is ${formattedDate} (India Standard Time).
    
    Date & Time Queries:
    If the user asks about the current date or time, respond with a friendly, human-readable format based on the current date and time provided above.
    

                        Data :\n${JSON.stringify(data, null, 2)}`


                    switch (tutor.personality) {
                        case 'friendly':
                            tempPrompt += `Use a warm, encouraging tone. Be supportive and patient. Use emoticons occasionally to create a friendly atmosphere. `;
                            break;
                        case 'strict':
                            tempPrompt += `Be direct and focused on academic rigor. Push the student to excel and think critically. Focus on precision and accuracy. `;
                            break;
                        case 'witty':
                            tempPrompt += `Use humor and clever analogies to make learning more engaging. Be quick-witted but ensure the educational content remains clear. `;
                            break;
                        case 'default':
                        default:
                            tempPrompt += `Maintain a balanced, professional tone that prioritizes clarity and helpfulness. `;
                            break;
                    }
                    const messageContent = await formatResponse(tempPrompt);


                    messageFromAi.message += `\n\n ${messageContent}`


                    console.log(messageFromAi.message);

                    const result = await chat.sendMessage(messageFromAi.message);
                    const rawText = result.response.text().trim();



                    let cleanJson = rawText;
                    if (rawText.includes("```json")) {
                        cleanJson = rawText.replace(/```json\s*|\s*```/g, '');
                    }
                    let finalMessageFromAi = JSON.parse(cleanJson);


                    messageFromAi.message += `\n\nAlright, based on the above details, here's the conclusion:\n\n${finalMessageFromAi.message}`;




                }

                if (messageFromAi.requireTools.getUsersRoadmap === true) {
                    try {
                        const userRoadmap = await StudyPlan.findById(tutor.roadmap);


                        const currentDate = new Date();
                        const formattedDate = currentDate.toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            dateStyle: 'full',
                            timeStyle: 'short'
                        });

                        let tempPrompt = `The ${role === 'student' ? 'user' : 'parent of child'} has asked for ${message} and Here are the details get only relevent information form this and respond only in markdown format.
                            
    
                            ${role === 'parent' && 'be respectfull with the parent'}
    
                             Current Date & Time Information:
        The current date and time is ${formattedDate} (India Standard Time).
        
        Date & Time Queries:
        If the user asks about the current date or time, respond with a friendly, human-readable format based on the current date and time provided above.
        
    
                            Data :\n${JSON.stringify(userRoadmap, null, 2)}`


                        switch (tutor.personality) {
                            case 'friendly':
                                tempPrompt += `Use a warm, encouraging tone. Be supportive and patient. Use emoticons occasionally to create a friendly atmosphere. `;
                                break;
                            case 'strict':
                                tempPrompt += `Be direct and focused on academic rigor. Push the student to excel and think critically. Focus on precision and accuracy. `;
                                break;
                            case 'witty':
                                tempPrompt += `Use humor and clever analogies to make learning more engaging. Be quick-witted but ensure the educational content remains clear. `;
                                break;
                            case 'default':
                            default:
                                tempPrompt += `Maintain a balanced, professional tone that prioritizes clarity and helpfulness. `;
                                break;
                        }
                        const messageContent = await formatResponse(tempPrompt);


                        messageFromAi.message += `\n\n ${messageContent}`


                        console.log(messageFromAi.message);

                        const result = await chat.sendMessage(messageFromAi.message);
                        const rawText = result.response.text().trim();



                        let cleanJson = rawText;
                        if (rawText.includes("```json")) {
                            cleanJson = rawText.replace(/```json\s*|\s*```/g, '');
                        }
                        let finalMessageFromAi = JSON.parse(cleanJson);


                        messageFromAi.message += `\n\nAlright, based on the above details, here's the conclusion:\n\n${finalMessageFromAi.message}`;


                    } catch (error) {
                        console.error('Error fetching roadmap tasks:', error);
                    }
                }
            }
            return messageFromAi.message;


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