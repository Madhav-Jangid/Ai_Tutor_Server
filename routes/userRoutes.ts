import express from 'express';
import { getUserDetails } from '../controllers/userController';

const router = express.Router();

router.get('/details', getUserDetails);

export default router;