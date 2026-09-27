/**
 * Public blog endpoints: published posts only. Mounted at /api/blog before the
 * buyer router in index.js so logged-out visitors (and the build) can read it.
 */
import express from 'express';

const router = express.Router();

export default router;
