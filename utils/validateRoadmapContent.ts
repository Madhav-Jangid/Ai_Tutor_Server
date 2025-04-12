import { GoogleGenAI } from "@google/genai";
import { config } from "../config";
import validateRoadmap from "./Prompts/validateRoadmap";


const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });


export const validateRoadmapContent = async (textContent: string, tutor: any): Promise<boolean> => {


    const prompt = validateRoadmap(tutor);

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
            { role: 'user', text: `${prompt}\n\nDocument:\n${textContent}` }
        ],
        config: {
            systemInstruction: '',
            responseMimeType: 'application/json'
        },
    });

    try {
        const output = await response?.text!;
        if (typeof output === 'boolean') {
            return output;
        }

        if (typeof output === 'string') {
            const parsed = JSON.parse(output);
            return typeof parsed === 'boolean' ? parsed : false;
        }

        return false;
    } catch (error) {
        console.error('Validation failed:', error);
        return false;
    }
};
