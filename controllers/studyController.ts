import { jsonrepair } from 'jsonrepair';
import StudyPlan from '../models/Roadmap';
import Tutor from '../models/Tutor';
import Task from '../models/Task';
import StudyContent from '../models/StudyContent';
import generateStudyContentPrompt from '../utils/Prompts/StudyContentPrompt';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import parseStudyTime from '../utils/parseStudyTime';

const { studyContnetSchema } = require('../Services/models/studyContentSchema');


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


const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);


export const generateStudyContent = async (req: any, res: any) => {
    try {
        const { lessonData, task } = req.body as StudyPlanRequest;

        if (!lessonData?.tutorId || !lessonData.title || !task?._id) {
            return res.status(400).json({ error: 'Missing required fields in request body' });
        }

        const tutor = await Tutor.findById(lessonData.tutorId).populate('roadmap').lean();
        if (!tutor) {
            return res.status(404).json({ error: 'Tutor not found' });
        }

        const studyPlanObj = await StudyPlan.findById(tutor.roadmap).lean();
        if (!studyPlanObj?.roadmap) {
            return res.status(404).json({ error: 'Roadmap not found' });
        }

        const studyContentPrompt = generateStudyContentPrompt(lessonData, tutor, studyPlanObj.roadmap);

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
};