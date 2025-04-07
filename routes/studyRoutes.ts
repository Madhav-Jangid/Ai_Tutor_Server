import express from 'express';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { jsonrepair } from 'jsonrepair';

// Models
import StudyPlan from '../models/Roadmap';
import Tutor from '../models/Tutor';
import Task from '../models/Task';
import StudyContent from '../models/StudyContent';

// Types
interface LessonRequest {
    _id: string;
    title: string;
    description: string;
    estimated_time: string;
    status: string;
    tutorId: string;
}

interface StudyPlanRequest {
    lessonData: LessonRequest;
    task: any;
}

// Import the schema from the separate file
const { studyContnetSchema } = require('./ModelSchema/studyContentSchema');

const router = express.Router();

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);


/**
 * Parses a time string and converts it to hours
 * @param timeString String like "2 hours 30 minutes"
 * @returns Number of hours as a float
 */
function parseStudyTime(timeString: string): number {
    // Remove commas and trim whitespace
    const cleanedTime = timeString.replace(/,/g, '').trim();

    // Regular expression to match hours and minutes
    const hoursMatch = cleanedTime.match(/(\d+)\s*(?:hour|hr)s?/i);
    const minutesMatch = cleanedTime.match(/(\d+)\s*(?:minute|min)s?/i);

    // Parse hours and minutes, defaulting to 0 if not found
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

    // Convert to hours (minutes as fraction of hour)
    return hours + (minutes / 60);
}

/**
 * Generates a study content prompt based on lesson data and tutor information
 */
function generateStudyContentPrompt(lessonData: LessonRequest, tutor: any, roadmap: any): string {
    return `
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
         * Spaced Repetition: ${roadmap.learning_strategies?.spaced_repetition || 'N/A'}
         * Active Recall: ${roadmap.learning_strategies?.active_recall || 'N/A'}
         * Pomodoro Technique: ${roadmap.learning_strategies?.pomodoro || 'N/A'}
    
    Special Instructions:
    - Ensure content is engaging and personalized
    - Provide clear, simple explanations
    - Include practical examples
    - Create a structured, easy-to-follow learning experience
    `;
}

/**
 * Route to generate study content for a topic
 */
router.post('/generate-topic-content', async (req: any, res: any) => {
    try {
        const { lessonData, task } = req.body as StudyPlanRequest;

        // Input validation
        if (!lessonData?.tutorId || !lessonData.title || !task?._id) {
            return res.status(400).json({ error: 'Missing required fields in request body' });
        }

        // Find the tutor with populated roadmap
        const tutor = await Tutor.findById(lessonData.tutorId).populate('roadmap').lean();
        if (!tutor) {
            return res.status(404).json({ error: 'Tutor not found' });
        }

        // Find the study plan associated with the tutor's roadmap
        const studyPlanObj = await StudyPlan.findById(tutor.roadmap).lean();
        if (!studyPlanObj?.roadmap) {
            return res.status(404).json({ error: 'Roadmap not found' });
        }

        const studyContentPrompt = generateStudyContentPrompt(lessonData, tutor, studyPlanObj.roadmap);

        // Set up Gemini model with response schema
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: studyContnetSchema,
            },
        });

        // Generate content
        const result = await model.generateContent([{ text: studyContentPrompt }]);
        const rawText = await result.response.text();

        // Clean and parse the response
        const cleanedText = rawText.replace(/^```json\n?/, "").replace(/\n?```$/, "");

        let studyPlan;
        try {
            studyPlan = JSON.parse(cleanedText);

            // Convert time string to number if needed
            if (typeof studyPlan.estimated_study_time === 'string') {
                studyPlan.estimated_study_time = parseStudyTime(studyPlan.estimated_study_time);
            }
        } catch (parseError) {
            console.log('Initial JSON parse failed:', parseError instanceof Error ? parseError.message : parseError);

            // Attempt to repair the JSON
            try {
                const repairedText = jsonrepair(cleanedText);
                studyPlan = JSON.parse(repairedText);

                if (typeof studyPlan.estimated_study_time === 'string') {
                    studyPlan.estimated_study_time = parseStudyTime(studyPlan.estimated_study_time);
                }
            } catch (repairError) {
                console.error('JSON repair failed:', repairError instanceof Error ? repairError.message : repairError);
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

            // Update task status
            await Task.findByIdAndUpdate(
                task._id,
                { status: 'In Progress' },
                { new: true, runValidators: true }
            );

            return res.status(200).json({ studyPlan: validatedPlan });
        } catch (validationError) {
            console.error('Schema validation failed:', validationError instanceof Error ? validationError.message : validationError);
            return res.status(500).json({
                error: 'Generated study plan does not conform to the schema',
                details: validationError instanceof Error ? validationError.message : 'Unknown error',
            });
        }
    } catch (error) {
        console.error('Error generating lesson content:', error instanceof Error ? error.message : error);
        return res.status(500).json({
            error: 'Failed to generate lesson content',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;