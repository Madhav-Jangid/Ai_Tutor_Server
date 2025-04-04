import express, { Request, Response } from 'express';
import StudyPlan from '../models/Roadmap'; // Adjust the path as per your project structure
import { jsonrepair } from 'jsonrepair';
import Tutor from '../models/Tutor';
import User from '../models/User';
import mongoose from 'mongoose';
import Task from '../models/Task';
import { GoogleGenerativeAI } from '@google/generative-ai';
import StudyContent from '../models/StudyContent';


const router = express.Router();

// Interface for the incoming request body
interface LessonRequest {
    _id: string;
    title: string;
    description: string;
    estimated_time: string;
    status: string;
    tutorId: string;
}




const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'AIzaSyBbVe--mpuyOccBdMEWErO1FrIfSUTqXms');


router.post('/generate-topic-content', async (req: any, res: any) => {
    try {
        const { lessonData, task }: { lessonData: LessonRequest, task: any } = req.body;

        // Find the tutor associated with this lesson
        const tutor = await Tutor.findById(lessonData.tutorId).populate('roadmap');

        if (!tutor) {
            return res.status(404).json({ error: 'Tutor not found' });
        }

        // Find the study plan associated with the tutor's roadmap
        const studyPlanCont = await StudyPlan.findById(tutor.roadmap);
        const roadmap = studyPlanCont?.roadmap;


        if (!roadmap) {
            return res.status(404).json({ error: 'Roadmap not found' });
        }

        const studyContentPrompt = `
        Generate a comprehensive study content module for the topic "${lessonData.title}" and for topic dicription "${lessonData.description} with the following specifications:
        
        Output Format:
        {
          "topic": "${lessonData.title}",
          "subject": "${tutor.subject}",
          "difficulty": "<Determined based on roadmap difficulty>",
          "estimated_study_time": <Calculate based on roadmap daily study plan>,
          "readme": "<Comprehensive markdown-formatted README content>",
          "quiz": [
            {
              "question": "<Detailed question>",
              "options": ["<Option 1>", "<Option 2>", "<Option 3>", "<Option 4>"],
              "correct_answer": "<Correct option>",
              "explanation": "<Detailed explanation of the answer>"
            }
            // Additional quiz questions
          ]
        }
        
        Content Generation Guidelines:
        1. README Content Requirements:
           - Provide a comprehensive, detailed explanation of the topic
           - Use markdown formatting with clear headings and structure
           - Include:
             * Detailed concept explanations
             * Real-world applications
             * Key takeaways
             * Examples and case studies
             * Visual explanation aids (described in text)
        
        2. Quiz Generation:
           - Create 5-10 questions covering different aspects of the topic
           - Vary question types (multiple choice, true/false, short answer)
           - Align difficulty with student's learning pace (${tutor.pace})
           - Tailor to student's learning style (${tutor.learningStyle})
        
        3. Personalization Factors:
           - Adapt content to student's interests: ${tutor.interests}
           - Use language: ${tutor.language}
           - Consider tutor personality: ${tutor.personality}
        
        4. Difficulty and Time Estimation:
           - Assess difficulty based on roadmap: ${roadmap.key_topics}
           - Estimate study time considering: ${roadmap.daily_study_plan}
        
        5. Learning Strategies Integration:
           - Incorporate:
             * Spaced Repetition: ${roadmap.learning_strategies.spaced_repetition}
             * Active Recall: ${roadmap.learning_strategies.active_recall}
             * Pomodoro Technique: ${roadmap.learning_strategies.pomodoro}
        
        Special Instructions:
        - Ensure content is engaging and personalized
        - Provide clear, simple explanations
        - Include practical examples
        - Create a structured, easy-to-follow learning experience
        `


        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent([{ text: studyContentPrompt }]);
        const rawText = await result.response.text();


        let studyPlan;
        const cleanedText = rawText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        function parseStudyTime(timeString: string): number {
            // Remove any commas and trim whitespace
            const cleanedTime = timeString.replace(/,/g, '').trim();

            // Regular expression to match hours and minutes
            const hoursMatch = cleanedTime.match(/(\d+)\s*(?:hour|hr)s?/i);
            const minutesMatch = cleanedTime.match(/(\d+)\s*(?:minute|min)s?/i);

            // Parse hours and minutes, defaulting to 0 if not found
            const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
            const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

            // Convert to total minutes
            const totalMinutes = (hours * 60) + minutes;

            // Convert back to hours for database storage
            return totalMinutes / 60;
        }


        try {
            studyPlan = JSON.parse(cleanedText);


            if (typeof studyPlan.estimated_study_time === 'string') {
                studyPlan.estimated_study_time = parseStudyTime(studyPlan.estimated_study_time);
            }


        } catch (parseError) {
            if (parseError instanceof Error) {
                console.log('Initial JSON parse failed:', parseError.message);
            } else {
                console.log('Initial JSON parse failed:', parseError);
            }

            // If parsing fails, attempt to repair the JSON
            try {
                const repairedText = jsonrepair(cleanedText);
                studyPlan = JSON.parse(repairedText);
                console.log(studyPlan);

            } catch (repairError) {
                if (repairError instanceof Error) {
                    console.error('JSON repair failed:', repairError.message);
                } else {
                    console.error('JSON repair failed:', repairError);
                }
                return res.status(500).json({
                    error: 'AI generated an invalid study plan',
                    rawResponse: rawText,
                });
            }
        }

        // Validate the study plan against the schema
        try {
            const validatedPlan = new StudyContent(studyPlan);
            await validatedPlan.validate();


            await Task.findOneAndUpdate(
                { _id: task._id },
                { status: 'In Progress' },
                { new: true, runValidators: true }
            );

            return res.status(200).json({ studyPlan: validatedPlan });
        } catch (validationError) {
            if (validationError instanceof Error) {
                console.error('Schema validation failed:', validationError.message);
                return res.status(500).json({
                    error: 'Generated study plan does not conform to the schema',
                    details: validationError.message,
                });
            } else {
                console.error('Schema validation failed:', validationError);
                return res.status(500).json({
                    error: 'Generated study plan does not conform to the schema',
                    details: 'Unknown error',
                });
            }
        }

    } catch (error) {
        console.error('Error generating lesson content:', error);
        res.status(500).json({
            error: 'Failed to generate lesson content',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;