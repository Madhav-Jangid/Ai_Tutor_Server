import express from 'express';
import {
    generateStudenntSummary,
    getAllTutors,
    getTutorInfoById,
    saveTutor
} from '../controllers/tutorController';

const router = express.Router();

router.post('/save', saveTutor);

router.post('/all', getAllTutors);

router.get('/info/:_id', getTutorInfoById);

router.post('/generateSummary/:_id', generateStudenntSummary);

export default router;