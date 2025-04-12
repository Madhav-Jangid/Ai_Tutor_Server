import express from 'express';
import { getParentInfoWithChildrens } from '../../controllers/parentController';

const router = express.Router();

router.get('/getInfo/:parentId', getParentInfoWithChildrens);

export default router;
