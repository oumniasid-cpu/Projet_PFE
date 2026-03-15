const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true 
  },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  date: { type: Date, default: Date.now },
  content: { type: String, required: true },
  tasks: [{
    description: String,
    completed: Boolean
  }],
  status: { type: String, enum: ['pending', 'completed'], default: 'completed' }
});

module.exports = mongoose.model('Report', reportSchema);


const express = require('express');
const router = express.Router();
const reportCtrl = require('../controllers/reportsController');
const auth = require('../middleware/authMiddleware'); // Votre protection JWT

router.get('/list-projects', auth, reportCtrl.getProjectsForDropdown);
router.post('/add', auth, reportCtrl.createDailyReport);

module.exports = router;