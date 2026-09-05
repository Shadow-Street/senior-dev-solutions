const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Courses CRUD
const courseController = createCrudController(db.Course, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get featured courses
router.get('/featured', async (req, res) => {
  try {
    const courses = await db.Course.findAll({
      where: { is_featured: true, status: 'published' },
      order: [['enrollment_count', 'DESC']],
      limit: 10
    });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get courses by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const courses = await db.Course.findAll({
      where: { category, status: 'published' },
      order: [['created_at', 'DESC']]
    });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, courseController);

// Enrollments sub-routes
const enrollmentRouter = express.Router();
const enrollmentController = createCrudController(db.CourseEnrollment, {
  defaultOrderBy: 'enrolled_at',
  defaultOrder: 'DESC'
});

// Get user's enrollments
enrollmentRouter.get('/my-enrollments', authMiddleware, async (req, res) => {
  try {
    const enrollments = await db.CourseEnrollment.findAll({
      where: { user_id: req.user.id },
      include: [{ model: db.Course }],
      order: [['enrolled_at', 'DESC']]
    });
    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enroll in course
enrollmentRouter.post('/enroll', authMiddleware, async (req, res) => {
  try {
    const { course_id } = req.body;
    
    // Check if already enrolled
    const existing = await db.CourseEnrollment.findOne({
      where: { user_id: req.user.id, course_id }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }
    
    const enrollment = await db.CourseEnrollment.create({
      user_id: req.user.id,
      course_id,
      enrolled_at: new Date(),
      status: 'active',
      progress: 0
    });
    
    // Increment enrollment count
    await db.Course.increment('enrollment_count', { where: { id: course_id } });
    
    res.status(201).json(enrollment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(enrollmentRouter, enrollmentController);
router.use('/enrollments', enrollmentRouter);

module.exports = router;