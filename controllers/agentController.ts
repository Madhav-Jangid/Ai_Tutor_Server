import mongoose from "mongoose";
import { getCurrentDateParts } from "../utils/getCurrentDateParts";
import Task from "../models/Task";
import Tutor from "../models/Tutor";
import StudyPlan from '../models/Roadmap';
import User from "../models/User";
import Tesseract from "tesseract.js";
import PdfParse from "pdf-parse";
import mammoth from "mammoth";
import { validateRoadmapContent } from "../utils/validateRoadmapContent";
import generatePromptForRoadmap from "../utils/Prompts/RoadmapPrompt";
import { GoogleGenAI } from "@google/genai";
import { config } from "../config";
import { jsonrepair } from "jsonrepair";
const { roadmapSchemaforGemini } = require('../Services/models/roadmapSchema');

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });


export const makeRoadmap = async (req: any, res: any) => {


    const { deadline, tutor: tutorData, socketId } = req.body;

    const io = req.app.get('io');

    const emitProgress = (message: string) => {
        if (!socketId) {
            console.log('Warning: socketId is undefined, cannot emit progress');
            return;
        }
        io.to(socketId).emit('roadmap-progress', { message, timestamp: new Date().toISOString() });
    };

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!deadline) {
            return res.status(400).json({ error: 'Deadline is required' });
        }

        const tutor = JSON.parse(tutorData);

        const image = {
            inlineData: {
                data: req.file.buffer.toString('base64'),
                mimeType: req.file.mimetype,
            },
        };
        emitProgress('📥 File uploaded and data received');

        let extractedText = '';
        const mime = req.file.mimetype;

        emitProgress('📄 Extracting text from uploaded file...');

        if (mime.startsWith('image/')) {
            const ocrResult = await Tesseract.recognize(req.file.buffer, 'eng');
            extractedText = ocrResult.data.text;
        } else if (mime === 'application/pdf') {
            const pdfResult = await PdfParse(req.file.buffer);
            extractedText = pdfResult.text;
        } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            extractedText = result.value;
        } else {
            return res.status(400).json({ error: 'Unsupported file format' });
        }




        if (!extractedText || extractedText.trim().length < 100) {
            return res.status(400).json({
                error: 'The extracted content appears too short or incomplete. Please upload a more detailed syllabus document.',
            });
        }

        const isValidSyllabus = await validateRoadmapContent(extractedText, tutor);
        console.log('Syllabus validation result:', isValidSyllabus);

        if (!isValidSyllabus) {
            return res.status(400).json({
                error: `The uploaded document does not appear to be a valid syllabus for the subject "${tutor.subject}". Please upload the correct syllabus.`,
            });
        }


        const roadmapPrompt = generatePromptForRoadmap(tutor, deadline, extractedText);


        emitProgress('🧠 Sending image and prompt to AI model');

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ text: roadmapPrompt }, image],
            config: {
                responseMimeType: 'application/json',
                responseSchema: roadmapSchemaforGemini

            },
        });

        emitProgress('⚙️ Processing AI response');

        const rawText: string = response?.text!;

        if (rawText.trim() === `Please upload a valid ${tutor.subject} syllabus.`) {
            return res.status(400).json({ error: `Please upload a valid ${tutor.subject} syllabus.` });
        }

        try {
            let studyPlan;
            try {
                studyPlan = JSON.parse(rawText);
                console.log('✅ Roadmap generated succsesfully...');

            } catch (parseError) {
                emitProgress('🛠️ Attempting to repair JSON');

                const repairedText = jsonrepair(rawText);
                studyPlan = JSON.parse(repairedText);
                console.log('✅ Roadmap generated succsesfully but in second attempt...');
            }
            if (!studyPlan.subject || !studyPlan.roadmap.overview) {
                const overview = `
                    Hi there, I’m ${tutor.name}, and I’ll be guiding you through your journey in ${tutor.subject}!

                    I’ve designed this roadmap just for you — it breaks down everything you need to learn into weekly goals, daily tasks, and key milestones so you always know what’s coming next. Whether you’re brushing up on the basics or diving into more advanced concepts, we’ll move at your pace and keep things structured and motivating.

                    I’ve also included my favorite strategies like active recall, spaced repetition, and curated resources to make your learning more effective. And don’t worry — I’ll be checking in regularly to help you stay on track and answer any questions you have.

                    Let’s work together to turn your goals into wins, one step at a time. Ready to get started? 😊
                    `;

                studyPlan.subject = tutorData.subject;
                studyPlan.roadmap.overview = overview;

            }
            emitProgress('✅ Validating final roadmap');

            const validatedPlan = new StudyPlan(studyPlan);
            await validatedPlan.validate();

            emitProgress('🚀 Roadmap generated successfully');

            return res.status(200).json({ roadmap: studyPlan });
        } catch (error) {
            emitProgress('❌ Failed to generate roadmap');

            console.error('Error processing AI response:', error);
            return res.status(500).json({
                error: 'Failed to process the generated study plan',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    } catch (error) {
        console.error('Error generating roadmap:', error);
        return res.status(500).json({
            error: 'Failed to generate roadmap',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const getAllTasks = async (req: any, res: any) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        // Fetch tasks grouped by Year -> Month -> Day
        const tasks = await Task.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: { year: "$year", month: "$month", day: "$day" },
                    tasks: { $push: "$$ROOT" },
                },
            },
            { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
        ]);

        return res.status(200).json({
            success: true,
            tasks,
            today: getCurrentDateParts(),
        });
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return res.status(500).json({ success: false, message: "Failed to get tasks." });
    }
};

export const confirmRoadmap = async (req: any, res: any) => {
    try {
        const { userId, roadmapData, tutorId } = req.body;

        if (!userId || !roadmapData || !tutorId) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const tutorInfo = await Tutor.findById(tutorId);

        if (tutorInfo?.roadmap) {
            return res.status(400).json({ success: false, message: "Roadmap is already saved" });
        }


        if (roadmapData._id) {
            delete roadmapData._id;
        }

        const studyPlan = new StudyPlan(roadmapData);
        const savedPlan = await studyPlan.save();

        const tasksByDate = new Map();

        const bulkTasksPromises = savedPlan.roadmap.daily_study_plan.flatMap(async (entry: any) => {
            const tasksForDay = [];

            for (const task of entry.tasks) {
                const newTask = new Task({
                    userId: new mongoose.Types.ObjectId(userId),
                    title: task.title,
                    tutorId,
                    description: task.description,
                    estimated_time: task.estimated_time,
                    status: "Pending",
                    year: entry.date instanceof Date ? entry.date.getFullYear().toString() : "0000",
                    month: entry.date instanceof Date ? (entry.date.getMonth() + 1).toString().padStart(2, "0") : "00",
                    day: entry.date instanceof Date ? entry.date.getDate().toString().padStart(2, "0") : "00",
                    time: entry.date
                });

                const savedTask = await newTask.save();
                tasksForDay.push(savedTask);
            }

            const dateKey = entry.date instanceof Date ? entry.date.toISOString() : entry.date.toString();
            tasksByDate.set(dateKey, tasksForDay);

            return tasksForDay;
        });

        await Promise.all(bulkTasksPromises);

        const updatedDailyStudyPlan = savedPlan.roadmap.daily_study_plan.map((day: any) => {
            const dateKey = day.date instanceof Date ? day.date.toISOString() : day.date.toString();
            const tasksForDay = tasksByDate.get(dateKey) || [];

            const updatedTasks = day.tasks.map((task: any, index: number) => {
                if (tasksForDay[index]) {
                    return {
                        ...task,
                        taskId: tasksForDay[index]._id
                    };
                }
                return task;
            });

            return {
                ...day,
                tasks: updatedTasks
            };
        });

        savedPlan.roadmap.daily_study_plan = updatedDailyStudyPlan;
        await savedPlan.save();

        const updatedTutor = await Tutor.findByIdAndUpdate(
            tutorId,
            { $set: { roadmap: savedPlan._id } },
            { new: true, upsert: true }
        );

        return res.status(200).json({
            success: true,
            message: "Roadmap confirmed successfully!",
            roadmapId: savedPlan._id,
            tutor: updatedTutor
        });
    } catch (error) {
        console.error("Error confirming roadmap:", error);
        return res.status(500).json({ success: false, message: "Failed to confirm roadmap." });
    }
};

export const getRoadmapById = async (req: any, res: any) => {
    try {
        const roadmapId = req.params._id;

        if (!mongoose.Types.ObjectId.isValid(roadmapId)) {
            return res.status(400).json({ error: 'Invalid Roadmap ID format' });
        }

        const roadmap = await StudyPlan.findById(roadmapId).lean();

        if (!roadmap) {
            return res.status(404).json({ success: false, error: "Roadmap not found" });
        }

        return res.status(200).json({ success: true, roadmap });
    } catch (error) {
        console.error("Error fetching roadmap:", error);
        return res.status(500).json({ success: false, error: "Failed to fetch roadmap" });
    }
};

export const saveTutor = async (req: any, res: any) => {
    try {
        const { studentId, avatar, name, subject, personality, learningStyle, interests, pace, language } = req.body;

        // Create new tutor instance
        const newTutor = new Tutor({
            studentId,
            avatar,
            name,
            subject,
            personality: personality || 'default',
            learningStyle,
            interests: interests || [],
            pace: pace || 'medium',
            language: language || 'English'
        });

        // Save to database
        const savedTutor = await newTutor.save();

        // Add tutor ID to user's tutors array
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ error: 'Invalid studentId format' });
        }

        const user = await User.findByIdAndUpdate(
            studentId.toString(),
            { $push: { tutors: savedTutor._id } },
            { new: true }
        );


        if (!user) {
            throw new Error('User not found');
        }

        return res.status(201).json({
            message: 'Tutor saved successfully',
            tutor: savedTutor
        });
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error saving tutor:', error.message);
            return res.status(500).json({ error: error.message });
        } else {
            console.error('Error saving tutor:', error);
            return res.status(500).json({ error: 'Failed to save tutor' });
        }
    }
};

export const getTutors = async (req: any, res: any) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Fetch the user's tutors (list of ObjectIds)
        const user = await User.findById(userId).select('tutors');

        if (!user || !Array.isArray(user.tutors) || user.tutors.length === 0) {
            return res.status(404).json({ error: 'No tutors found for this user' });
        }

        // Fetch tutor details using the retrieved tutor IDs
        const tutors = await Tutor.find({ _id: { $in: user.tutors } });

        return res.status(200).json({ tutors });
    } catch (error) {
        console.error('Error fetching tutors:', error);
        return res.status(500).json({ error: 'Failed to fetch tutors' });
    }
};