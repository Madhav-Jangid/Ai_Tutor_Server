import express from 'express';
import { generateStudyContent } from '../controllers/studyController';

const router = express.Router();

router.post('/generate-topic-content', generateStudyContent);

export default router;