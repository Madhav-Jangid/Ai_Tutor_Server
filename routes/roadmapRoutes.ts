import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import StudyPlan from '../models/Roadmap'; // Adjust the path as per your project structure
import { jsonrepair } from 'jsonrepair';
import Tutor from '../models/Tutor';
import User from '../models/User';
import mongoose from 'mongoose';
import Task from '../models/Task';





const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'AIzaSyBbVe--mpuyOccBdMEWErO1FrIfSUTqXms' || 'AIzaSyBbVe--mpuyOccBdMEWErO1FrIfSUTqXms' as string);

const { roadmapSchemaforGemini } = require('./ModelSchema/roadmapSchema');

/**
 * Route to generate a study plan roadmap based on an uploaded syllabus image
 * and deadline.
 */
router.post('/makeRoadmap', upload.single('image'), async (req: any, res: any) => {
    try {
        // Check if required data exists
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { deadline, tutor: tutorData } = req.body;
        if (!deadline) {
            return res.status(400).json({ error: 'Deadline is required' });
        }

        const tutor = JSON.parse(tutorData);

        // Generate roadmap using AI
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: roadmapSchemaforGemini,
            },
        });

        const image = {
            inlineData: {
                data: req.file.buffer.toString('base64'),
                mimeType: req.file.mimetype,
            },
        };

        const roadmapPrompt = `
          Analyze the uploaded syllabus to determine if it contains a valid and structured ${tutor.subject} curriculum. If the document is invalid, unclear, or missing key details, respond with exactly: "Please upload a valid ${tutor.subject} syllabus."
          
          **Step 1: Curriculum Extraction**  
          - Identify and extract ONLY the relevant ${tutor.subject} content from the uploaded document.  
          - If multiple subjects are present, isolate and structure content exclusively for ${tutor.subject}.  
          
          **Step 2: Personalized Study Roadmap Creation**  
          Using the extracted content, generate a highly customized study roadmap from ${new Date().toISOString().split('T')[0]} to ${deadline}, optimized for the student's unique learning profile:
          
          ### **Student Profile**
          - **Name:** Call student with in ${tutor.personality} manner
          - **Learning Style:** ${tutor.learningStyle} (Ensure primary techniques align with this)
          - **Study Pace:** ${tutor.pace} (Adjust workload accordingly)
          - **Personal Interests:** ${tutor.interests.length > 0 ? tutor.interests.join(', ') : "None provided"}
          - **Preferred Teaching Style:** ${tutor.personality}
          - **Language of Instruction:** ${tutor.language}
          
          ### **Learning Summary**
          "${tutor.studentSummary}"  
          (Ensure all roadmap components align with this profile.)
          
          ---
          
          ### **Roadmap Structure**
          Return a well-formatted JSON object with the following schema:
          
           ### **Schema Explanation**
        Your response must follow the structure below:
        
        #### **1. Subject and Deadline**
        - **subject** (String, Required): The name of the subject.
        - **deadline** (Date, Required): The final date for completing the study plan.
        - Extract **preferred study time** from **${tutor.studentSummary}** and ensure tasks align with this time.
        
        #### **2. Roadmap Structure**
        The **roadmap** object defines the entire study plan, including topics, schedules, strategies, and progress tracking.
        
        ##### **2.1 Overview**
        - **overview** (String, Required): A high-level summary of the study plan, personalized according to the student's learning style and needs.
        
        ##### **2.2 Key Topics**
        A list of essential topics to be covered:
        - **topic** (String, Required): Name of the topic.
        - **priority** (Enum: "High" | "Medium" | "Low", Required): Importance level.
        - **difficulty** (Enum: "Easy" | "Medium" | "Hard", Required): Complexity level.
        - **description** (String, Required): Brief explanation of the topic.
        - **estimated_time** (String, Required): Expected time required.
        - **resources** (Array, Required): Study materials for the topic, each containing:
          - **type** (String, Required): Resource type (book, video, etc.).
          - **title** (String, Required): Name of the resource.
          - **url** (String, Optional): Link to the resource if available.
        
        ##### **2.3 Weekly Study Plans**
        A structured breakdown of weekly study goals:
        - **week** (Number, Required): Week number.
        - **dates** (String, Required): Duration of the week ** must add these dates **.
        - **goals** (Array, Required): List of learning objectives.
        - **milestones** (Array, Required): Key achievements expected.
        - **activities** (Array, Required): Tasks to complete each week, including:
          - **title** (String, Required): Name of the activity.
          - **description** (String, Required): Details of the task.
          - **estimated_time** (String, Required): Expected time required.
        Make sure each field is clearly filled in, and that the weekly plan is actionable and student-friendly.

        
        ##### **2.4 Daily Study Plan**
        A more detailed breakdown of daily tasks:
        - **date** (Date, Required): The specific study date.
        - **tasks** (Array, Required): List of daily tasks, each containing:
          - **title** (String, Required): Task name.
          - **description** (String, Required): Task details.
          - **estimated_time** (String, Required): Expected duration.
          - **status** (Enum: "Pending" | "In Progress" | "Completed", Default: "Pending"): Task progress.
          - **year** (String, Required): Task year.
          - **month** (String, Required): Task month.
          - **day** (String, Required): Task day.
          - **time** (String, Required): Task time **in HH:MM am,pm format**.
        
        ##### **2.5 Study Resources**
        Recommended learning materials categorized as:
        - **books** (Array, Optional): List of books.
        - **articles** (Array, Optional): List of articles.
        - **videos** (Array, Optional): List of video resources.
        - **online_courses** (Array, Optional): Online courses.
        
        ##### **2.6 Learning Strategies**
        Study techniques to optimize retention, personalized based on **tutor.studentSummary**:
        - **spaced_repetition** (Boolean, Default: false): Whether spaced repetition is used.
        - **active_recall** (Boolean, Default: false): Whether active recall is used.
        - **pomodoro** (Boolean, Default: false): Whether Pomodoro technique is used.
        - **notes** (Boolean, Default: false): Whether note-taking is encouraged.
        - **group_study** (Boolean, Default: false): Whether group study is recommended.
        
        ##### **2.7 Progress Tracking**
        A method to track study progress:
        - **completed_topics** (Array, Required): Topics successfully studied.
        - **pending_topics** (Array, Required): Topics left to study.
        - **assessments** (Array, Required): List of evaluation checkpoints, each with:
          - **date** (Date, Required): Date of the assessment.
          - **score** (Number, Required): Score obtained.
        
        ##### **2.8 Tutor Support (Optional)**
        If a tutor is involved, provide details:
        - **tutor_name** (String, Optional): Tutor's name.
        - **contact** (String, Optional): Contact details.
        - **sessions** (Array, Optional): List of tutoring sessions, each containing:
          - **date** (Date, Optional): Session date.
          - **topic** (String, Optional): Subject discussed.
          - **notes** (String, Optional): Additional session notes.
        
        ---
        
        ### **Instructions**
        - Return *only* the JSON object, starting with '{' and ending with '}'.
        - Do not include additional text, explanations, or markdown (e.g., triple backticks).
        - Ensure the JSON is well-formatted and directly parseable by 'JSON.parse()'.
        - Populate all schema fields with appropriate values.
        - If the deadline is short, prioritize essential topics and suggest intensive study methods.
        - **Use the tutor's preferred communication style (${tutor.personality})** to keep the student engaged.  
        - Adapt the study plan based on the student's strengths, weaknesses, and preferred learning methods from **tutor.studentSummary**.
        `;

        const result = await model.generateContent([{ text: roadmapPrompt }, image]);
        const rawText = await result.response.text();

        // Handle specific AI response indicating invalid input
        if (rawText.trim() === `Please upload a valid ${tutor.subject} syllabus.`) {
            return res.status(400).json({ error: `Please upload a valid ${tutor.subject} syllabus.` });
        }

        // Process AI response
        const cleanedText = rawText.replace(/^```json\n?/, "").replace(/\n?```$/, "");

        try {
            // Parse JSON response, attempt repair if needed
            let studyPlan;
            try {
                studyPlan = JSON.parse(cleanedText);
            } catch (parseError) {
                console.log('Initial JSON parse failed, attempting repair');
                const repairedText = jsonrepair(cleanedText);
                studyPlan = JSON.parse(repairedText);
            }

            // Create and validate model
            const validatedPlan = new StudyPlan(studyPlan);
            await validatedPlan.validate();

            return res.status(200).json({ roadmap: validatedPlan });
        } catch (error) {
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
});


const getCurrentDateParts = () => {
    const now = new Date();
    return {
        year: now.getFullYear().toString(),
        month: (now.getMonth() + 1).toString().padStart(2, '0'),
        day: now.getDate().toString().padStart(2, '0'),
    };
};

// Get all tasks for a user, organized by Year -> Month -> Day
router.get('/all-tasks', async (req: any, res: any) => {
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
});

// Confirm and save a study roadmap for a user
router.post("/confirm-roadmap", async (req: any, res: any) => {
    try {
        const { userId, roadmapData, tutorId } = req.body;

        if (!userId || !roadmapData || !tutorId) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Remove _id from roadmapData if it exists to avoid duplicate key error
        if (roadmapData._id) {
            delete roadmapData._id; // Let Mongoose generate a new _id
        }

        // Save the roadmap to the database
        const studyPlan = new StudyPlan(roadmapData);
        const savedPlan = await studyPlan.save();


        // console.log(savedPlan.roadmap.daily_study_plan[0]);

        // Organize tasks by Year -> Month -> Day
        const bulkTasks = savedPlan.roadmap.daily_study_plan.flatMap((entry: any) =>
            entry.tasks.map((task: any) => ({
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
            }))
        );

        // Insert tasks into the Task collection
        await Task.insertMany(bulkTasks);

        // Update the Tutor with the roadmap reference
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
});



router.get('/get-roadmap/:_id', async (req: any, res: any) => {
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
});




router.post('/save-tutor', async (req: any, res: any) => {
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
});


router.post('/get-tutors', async (req: any, res: any) => {
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
});



export default router;