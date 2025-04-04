import express from 'express';
import Tutor from '../models/Tutor';
import User, { IUser } from '../models/User';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';





const router = express.Router();

router.post('/save', async (req: any, res: any) => {
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

router.post('/all', async (req: any, res: any) => {
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


router.get('/info/:_id', async (req: any, res: any) => {
    try {
        const userId = req.params._id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid Tutor ID format' });
        }

        const tutor = await Tutor.findOne({ _id: userId }).lean();

        if (!tutor) {
            return res.status(404).json({ error: 'Tutor not found' });
        }

        return res.status(200).json({ tutor });
    } catch (error) {
        console.error('Error fetching tutors:', error);
        return res.status(500).json({ error: 'Failed to fetch tutors' });
    }
});




const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'AIzaSyBbVe--mpuyOccBdMEWErO1FrIfSUTqXms');

// POST route to generate and save student summary
router.post('/generateSummary/:_id', async (req: any, res: any) => {
    try {
        const { subject, profileData, learningChallenges, personalFactors, metadata } = req.body;

        const prompt = `You are an expert educational consultant. Analyze the student's profile and generate an insightful learning summary as if explaining their study style to a third person. The response should not exceed 300 words and must follow a structured format.

        Generate a structured and engaging student learning summary for ${subject}, strictly within 300 words.  

**Student Profile:**  
- Skill Level: ${profileData.skillLevel}  
- Learning Style: ${profileData.learningStyle}  
- Pace of Learning: ${profileData.pace}  
- Study Time: ${profileData.studyHabits.dailyTime} hours  
- Preferred Study Time: ${profileData.studyHabits.preferredTimeOfDay}  

**Challenges:**  
- Weak Areas: ${learningChallenges.weakAreas.join(", ")}  
- Previous Help Experience: ${learningChallenges.previousHelpExperience}  

**Personal Factors:**  
- Motivation Type: ${personalFactors.motivationType}  
- Interests: ${personalFactors.interests.join(", ")}  
- Academic Goal: ${personalFactors.academicGoal}  

**Summary Requirements:**  
- Provide a concise overview of strengths and weaknesses.  
- Suggest learning strategies suited to their style and pace.  
- Recommend subject-specific techniques to address weak areas.  
- Include motivational insights to keep the student engaged.  
- Propose a study plan considering their preferences.  

Ensure the summary is **concise, well-structured, and actionable** within **300 words**. formatted in a way that reads like an analysis of their study style for a third-party audience. **dont add any cluter text just summary only**
`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);  // Removed unnecessary object wrapping
        const studentSummaryString = await result.response.text();


        const userId = req.params._id;
        if (!userId) {
            console.error('Tutor ID is missing');
            alert('Invalid tutor ID');
            return;
        }
        // console.log("Summary :- " + studentSummaryString);

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            console.log("Invalid id");

            return res.status(400).json({ error: "Invalid Tutor ID format" });
        }

        const tutor = await Tutor.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(userId) },
            { studentSummary: studentSummaryString },
            { new: true, upsert: true }
        );

        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        res.status(200).json({
            message: 'Student summary saved successfully',
            summary: studentSummaryString,  // Send back the summary in response
            tutor,
        });

    } catch (error: any) {
        console.error('Error saving student summary:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


export default router;