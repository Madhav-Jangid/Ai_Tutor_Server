import express from 'express';
import multer from 'multer';
import { confirmRoadmap, getAllTasks, getRoadmapById, getTutors, makeRoadmap, saveTutor } from '../controllers/agentController';



const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });


router.post('/makeRoadmap', upload.single('image'), makeRoadmap);


router.get('/all-tasks', getAllTasks);


router.post("/confirm-roadmap", confirmRoadmap);


router.get('/get-roadmap/:_id', getRoadmapById);


router.post('/save-tutor', saveTutor);


router.post('/get-tutors', getTutors);



export default router;