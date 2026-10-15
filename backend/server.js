const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
const JWT_SECRET = 'your_super_secret_jwt_key_change_in_production';
const MONGODB_URI = 'mongodb://localhost:27017/placement_db';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.log('❌ MongoDB Error:', err.message));

// ========== SCHEMAS ==========
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  instituteName: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  isPlaced: { type: Boolean, default: false },
  placedCompany: { type: String, default: '' },
  placedPackage: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const internshipSchema = new mongoose.Schema({
  title: String,
  companyName: String,
  description: String,
  location: String,
  salary: String,
  requiredSkills: { type: [String], default: [] },
  postedBy: String,
  createdAt: { type: Date, default: Date.now }
});
const Internship = mongoose.model('Internship', internshipSchema);

const studentProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  skills: { type: [String], default: [] },
  education: { type: String, default: '' },
  branch: { type: String, default: '' },
  year: { type: Number, default: null },
  phone: { type: String, default: '' },
  bio: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  github: { type: String, default: '' },
  profileComplete: { type: Boolean, default: false },
  performanceScore: { type: Number, default: 0 }
});
const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);

const applicationSchema = new mongoose.Schema({
  internshipId: { type: String, required: true },
  internshipTitle: { type: String, required: true },
  companyName: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  status: { type: String, enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'], default: 'pending' },
  appliedAt: { type: Date, default: Date.now },
  matchPercentage: { type: Number, default: 0 },
  notes: { type: String, default: '' }
});
const Application = mongoose.model('Application', applicationSchema);

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  studentId: { type: String, required: true },
  mentorId: { type: String, required: true },
  dueDate: Date,
  status: { type: String, enum: ['pending', 'submitted', 'reviewed'], default: 'pending' },
  score: { type: Number, default: 0 },
  feedback: { type: String, default: '' },
  submissionUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', taskSchema);

const instituteProfileSchema = new mongoose.Schema({
  userId: String,
  instituteName: String,
  address: String,
  phone: String,
  email: String,
  website: String,
  description: String
});
const InstituteProfile = mongoose.model('InstituteProfile', instituteProfileSchema);

const companyProfileSchema = new mongoose.Schema({
  userId: String,
  companyName: String,
  industry: String,
  location: String,
  website: String,
  description: String
});
const CompanyProfile = mongoose.model('CompanyProfile', companyProfileSchema);

const mentorProfileSchema = new mongoose.Schema({
  userId: String,
  expertise: [String],
  company: String,
  position: String,
  experience: Number,
  bio: String
});
const MentorProfile = mongoose.model('MentorProfile', mentorProfileSchema);

// ========== PLACEMENT SCHEMA ==========
const placementSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  companyName: { type: String, required: true },
  internshipTitle: { type: String, required: true },
  offerDetails: { type: String, default: '' },
  package: { type: String, default: '' },
  joiningDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['offered', 'accepted', 'joined'], default: 'offered' },
  createdAt: { type: Date, default: Date.now }
});
const Placement = mongoose.model('Placement', placementSchema);

// ========== AUTH MIDDLEWARE ==========
const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// ========== PERFORMANCE CALCULATION ==========
const calculatePerformanceScore = async (studentId) => {
  try {
    const profile = await StudentProfile.findOne({ userId: studentId });
    if (!profile) return 0;
    
    const skillPoints = Math.min((profile.skills?.length || 0) * 4, 20);
    const eduPoints = (profile.education ? 10 : 0) + (profile.branch ? 10 : 0);
    const infoPoints = (profile.year ? 10 : 0) + (profile.phone ? 10 : 0);
    const bioPoints = profile.bio ? 10 : 0;
    const profileScore = skillPoints + eduPoints + infoPoints + bioPoints;
    
    const tasks = await Task.find({ studentId: studentId, status: 'reviewed' });
    const taskAvg = tasks.length > 0 ? tasks.reduce((sum, t) => sum + (t.score || 0), 0) / tasks.length : 0;
    const taskContribution = Math.min(taskAvg * 0.6, 60);
    
    const totalScore = Math.min(Math.round(taskContribution + (profileScore * 0.4)), 100);
    
    profile.performanceScore = totalScore;
    profile.profileComplete = profile.skills?.length > 0 && profile.education && profile.branch && profile.year;
    await profile.save();
    
    return totalScore;
  } catch (error) {
    return 0;
  }
};



/* ========== SHARED SKILL MATCHING ========== */

function normalizeSkill(skill) {
  const value = String(skill ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const aliases = {
    "react.js": "react",
    "reactjs": "react",
    "node.js": "nodejs",
    "node js": "nodejs",
    "js": "javascript",
    "c++": "cplusplus",
    "c plus plus": "cplusplus",
    "c#": "csharp"
  };

  return aliases[value] || value;
}

function calculateSkillMatch(studentSkills = [], requiredSkills = []) {
  const studentSkillSet = new Set(
    studentSkills.map(normalizeSkill).filter(Boolean)
  );

  const uniqueRequirements = [];
  const seenRequirements = new Set();

  for (const skill of requiredSkills) {
    const normalized = normalizeSkill(skill);

    if (!normalized || seenRequirements.has(normalized)) {
      continue;
    }

    seenRequirements.add(normalized);
    uniqueRequirements.push({
      label: String(skill).trim(),
      normalized
    });
  }

  const matchedSkills = uniqueRequirements
    .filter(skill => studentSkillSet.has(skill.normalized))
    .map(skill => skill.label);

  const missingSkills = uniqueRequirements
    .filter(skill => !studentSkillSet.has(skill.normalized))
    .map(skill => skill.label);

  const totalRequiredSkills = uniqueRequirements.length;

  const matchPercentage = totalRequiredSkills > 0
    ? Math.round(
        (matchedSkills.length / totalRequiredSkills) * 100
      )
    : 0;

  return {
    matchPercentage,
    matchedSkills,
    missingSkills,
    matchedCount: matchedSkills.length,
    totalRequiredSkills
  };
}


// ========== TEST ROUTE ==========
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// ========== AUTH ROUTES ==========
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, instituteName } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });
    
    if (role === 'student' && instituteName) {
      user.instituteName = instituteName;
    }
    
    await user.save();

    if (role === 'student') {
      const profile = new StudentProfile({ userId: user._id.toString() });
      await profile.save();
      await calculatePerformanceScore(user._id.toString());
    } else if (role === 'company') {
      const profile = new CompanyProfile({ userId: user._id.toString(), companyName: name });
      await profile.save();
    } else if (role === 'institute') {
      const profile = new InstituteProfile({ userId: user._id.toString(), instituteName: name });
      await profile.save();
    } else if (role === 'mentor') {
      const profile = new MentorProfile({ userId: user._id.toString() });
      await profile.save();
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, instituteName: user.instituteName }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'No account found' });
    }

    if (user.role !== role) {
      return res.status(401).json({ 
        message: `This account is registered as "${user.role}". Please select the "${user.role}" role.`
      });
    }

    let isValid = false;
    if (user.password && user.password.startsWith('$2')) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      isValid = user.password === password;
      if (isValid && user.password && !user.password.startsWith('$2')) {
        user.password = await bcrypt.hash(password, 10);
        await user.save();
      }
    }

    if (!isValid) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, instituteName: user.instituteName }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== PROFILE ROUTES ==========
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    let profile = null;
    if (user.role === 'student') {
      profile = await StudentProfile.findOne({ userId: user._id.toString() });
    } else if (user.role === 'company') {
      profile = await CompanyProfile.findOne({ userId: user._id.toString() });
    } else if (user.role === 'institute') {
      profile = await InstituteProfile.findOne({ userId: user._id.toString() });
    } else if (user.role === 'mentor') {
      profile = await MentorProfile.findOne({ userId: user._id.toString() });
    }

    res.json({ user, profile });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== UPDATE STUDENT PROFILE ==========
// app.put('/api/student/profile', authMiddleware, async (req, res) => {
//   try {
//     const { skills, education, branch, year, phone, bio, linkedin, github } = req.body;

//     let profile = await StudentProfile.findOne({ userId: req.userId });
    
//     if (profile) {
//       profile.skills = skills || [];
//       profile.education = education || '';
//       profile.branch = branch || '';
//       profile.year = year ? parseInt(year) : null;
//       profile.phone = phone || '';
//       profile.bio = bio || '';
//       profile.linkedin = linkedin || '';
//       profile.github = github || '';
//       await profile.save();
//       await calculatePerformanceScore(req.userId);
//     }
    
//     res.json(profile);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });



app.put('/api/student/profile', authMiddleware, async (req, res) => {
  try {
    // 1. Only students can update student profiles
    if (req.userRole !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Student account required.'
      });
    }

    const allowedFields = [
      'skills',
      'education',
      'branch',
      'year',
      'phone',
      'bio',
      'linkedin',
      'github'
    ];

    const updates = {};

    // 2. Reject requests containing unsupported fields
    const submittedFields = Object.keys(req.body);
    const invalidFields = submittedFields.filter(
      field => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported profile field(s).',
        fields: invalidFields
      });
    }

    // 3. Validate skills
    if (req.body.skills !== undefined) {
      if (
        !Array.isArray(req.body.skills) ||
        !req.body.skills.every(
          skill => typeof skill === 'string' && skill.trim().length > 0
        )
      ) {
        return res.status(400).json({
          success: false,
          message: 'Skills must be an array of non-empty strings.'
        });
      }

      updates.skills = [
        ...new Set(req.body.skills.map(skill => skill.trim()))
      ];
    }

    // 4. Validate text fields
    const textFields = [
      'education',
      'branch',
      'phone',
      'bio',
      'linkedin',
      'github'
    ];

    for (const field of textFields) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string') {
          return res.status(400).json({
            success: false,
            message: `${field} must be a string.`
          });
        }

        updates[field] = req.body[field].trim();
      }
    }

    // 5. Validate academic year
    if (req.body.year !== undefined) {
      if (req.body.year === null || req.body.year === '') {
        updates.year = null;
      } else {
        const year = Number(req.body.year);

        if (!Number.isInteger(year) || year < 1 || year > 10) {
          return res.status(400).json({
            success: false,
            message: 'Year must be a valid integer between 1 and 10.'
          });
        }

        updates.year = year;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one valid profile field to update.'
      });
    }

    // 6. Find the logged-in student's own profile
    const profile = await StudentProfile.findOne({
      userId: String(req.userId)
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found. Please create your profile first.'
      });
    }

    // 7. Update only validated fields
    Object.assign(profile, updates);
    await profile.save();

    // 8. Recalculate performance score
    await calculatePerformanceScore(String(req.userId));

    return res.json({
      success: true,
      message: 'Student profile updated successfully.',
      profile
    });
  } catch (error) {
    console.error('Update student profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update student profile.'
    });
  }
});


// ========== INTERNSHIP ROUTES ==========
// app.get('/api/internships/matched', authMiddleware, async (req, res) => {
//   try {
//     const studentProfile = await StudentProfile.findOne({ userId: req.userId });
//     const studentSkills = studentProfile?.skills || [];
//     const allInternships = await Internship.find();
    
//     const matchedInternships = allInternships.map(internship => {
//       const requiredSkills = internship.requiredSkills || [];
//       let matchCount = 0;
//       requiredSkills.forEach(skill => {
//         if (studentSkills.some(s => s.toLowerCase().includes(skill.toLowerCase()))) {
//           matchCount++;
//         }
//       });
//       const matchPercentage = requiredSkills.length > 0 ? Math.round((matchCount / requiredSkills.length) * 100) : 0;
//       return { ...internship.toObject(), matchPercentage, isMatch: matchPercentage >= 40 };
//     });
    
//     const filteredInternships = matchedInternships.filter(i => i.isMatch);
//     res.json({ 
//       totalInternships: allInternships.length, 
//       matchedCount: filteredInternships.length, 
//       internships: filteredInternships, 
//       studentSkills 
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });




app.get('/api/internships/matched', authMiddleware, async (req, res) => {
  try {
    const studentProfile = await StudentProfile.findOne({
      userId: req.userId
    });

    const studentSkills = studentProfile?.skills || [];

    const allInternships = await Internship.find();

    const matchedInternships = allInternships.map((internship) => {
      const requiredSkills = internship.requiredSkills || [];

      const match = calculateSkillMatch(
        studentSkills,
        requiredSkills
      );

      const matchPercentage = match.matchPercentage;

      return {
        ...internship.toObject(),
        matchPercentage,
        isMatch: matchPercentage >= 40
      };
    });

    const filteredInternships = matchedInternships.filter(
      (internship) => internship.isMatch
    );

    res.json({
      totalInternships: allInternships.length,
      matchedCount: filteredInternships.length,
      internships: filteredInternships,
      studentSkills
    });

  } catch (error) {
    console.error('Matched internships error:', error);

    res.status(500).json({
      message: 'Server error'
    });
  }
});


app.get('/api/internships', async (req, res) => {
  const internships = await Internship.find();
  res.json(internships);
});

// app.post('/api/internships', authMiddleware, async (req, res) => {
//   const internship = new Internship(req.body);
//   await internship.save();
//   res.json(internship);
// });



app.post('/api/internships', authMiddleware, async (req, res) => {
  try {
    // Only company accounts can post internships
    if (req.userRole !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only company accounts can post internships.'
      });
    }

    // Verify that the company has a profile
    const companyProfile = await CompanyProfile.findOne({
      userId: req.userId
    });

    if (!companyProfile) {
      return res.status(404).json({
        success: false,
        message: 'Company profile not found. Please create your company profile first.'
      });
    }

    const {
      title,
      description,
      location,
      salary,
      requiredSkills
    } = req.body;

    // Validate required fields
    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof description !== 'string' ||
      !description.trim() ||
      typeof location !== 'string' ||
      !location.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and location are required.'
      });
    }

    // Validate skills
    if (
      requiredSkills !== undefined &&
      (!Array.isArray(requiredSkills) ||
        !requiredSkills.every(
          skill => typeof skill === 'string' && skill.trim()
        ))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Required skills must be an array of non-empty strings.'
      });
    }

    // Clean and deduplicate skills
    const cleanedSkills = [
      ...new Set(
        (requiredSkills || [])
          .map(skill => skill.trim())
          .filter(Boolean)
      )
    ];

    // Create internship using trusted company information
    const internship = new Internship({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      salary:
        typeof salary === 'string' || typeof salary === 'number'
          ? String(salary).trim()
          : '',
      requiredSkills: cleanedSkills,
      companyName: companyProfile.companyName,
      postedBy: String(req.userId)
    });

    await internship.save();

    return res.status(201).json({
      success: true,
      message: 'Internship posted successfully.',
      internship
    });
  } catch (error) {
    console.error('Create internship error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to post internship.'
    });
  }
});



// ========== SKILL MATCHING FOR COMPANIES ==========


app.get(
  '/api/internships/:internshipId/matched-students',
  authMiddleware,
  async (req, res) => {
    try {
      // 1. Only companies can access this route
      if (req.userRole !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Company account required.'
        });
      }

      // 2. Find the logged-in company's profile
      const companyProfile = await CompanyProfile.findOne({
        userId: req.userId
      });

      if (!companyProfile) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found.'
        });
      }

      // 3. Find the requested internship
      const internship = await Internship.findById(
        req.params.internshipId
      );

      if (!internship) {
        return res.status(404).json({
          success: false,
          message: 'Internship not found.'
        });
      }

      // 4. Verify internship ownership
      if (
        internship.companyName !== companyProfile.companyName
      ) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view students for this internship.'
        });
      }

      // 5. Get required skills
      const requiredSkills = internship.requiredSkills || [];

      if (requiredSkills.length === 0) {
        return res.json({
          success: true,
          internshipTitle: internship.title,
          requiredSkills: [],
          totalStudents: 0,
          totalMatches: 0,
          matchedStudents: [],
          message: 'No required skills are specified for this internship.'
        });
      }

      // 6. Get all student accounts
      const students = await User.find({
        role: 'student'
      }).select('-password');

      // 7. Calculate each student's skill match
      const studentResults = await Promise.all(
        students.map(async (student) => {
          const profile = await StudentProfile.findOne({
            userId: student._id.toString()
          });

          const studentSkills = profile?.skills || [];

          const match = calculateSkillMatch(
            studentSkills,
            requiredSkills
          );

          return {
            studentId: student._id,
            studentName: student.name,
            studentEmail: student.email,
            studentSkills,
            matchPercentage: match.matchPercentage,
            matchedSkills: match.matchedSkills,
            missingSkills: match.missingSkills,
            education: profile?.education || 'Not specified',
            branch: profile?.branch || 'Not specified',
            year: profile?.year || 'Not specified',
            performanceScore: profile?.performanceScore || 0
          };
        })
      );

      // 8. Keep matches of 40% or higher
      const matchedStudents = studentResults
        .filter((student) => student.matchPercentage >= 40)
        .sort(
          (a, b) => b.matchPercentage - a.matchPercentage
        );

      // 9. Send the response
      return res.json({
        success: true,
        internshipTitle: internship.title,
        requiredSkills,
        totalStudents: students.length,
        totalMatches: matchedStudents.length,
        matchedStudents
      });

    } catch (error) {
      console.error(
        'Error fetching matched students:',
        error
      );

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch matched students.'
      });
    }
  }
);



// ========== HIRE STUDENT - WITH PLACEMENT TRACKING ==========
// app.post('/api/company/hire', authMiddleware, async (req, res) => {
//   try {
//     if (req.userRole !== 'company') {
//       return res.status(403).json({ message: 'Access denied' });
//     }
    
//     const { studentId, offerDetails, package: salaryPackage } = req.body;
    
//     const student = await User.findById(studentId);
//     const profile = await StudentProfile.findOne({ userId: studentId });
    
//     if (!student) {
//       return res.status(404).json({ message: 'Student not found' });
//     }
    
//     const companyProfile = await CompanyProfile.findOne({ userId: req.userId });
//     const companyName = companyProfile?.companyName || req.user.name;
    
//     const application = await Application.findOne({ 
//       studentId: studentId, 
//       status: 'accepted' 
//     }).sort({ appliedAt: -1 });
    
//     const placement = new Placement({
//       studentId: studentId,
//       studentName: student.name,
//       studentEmail: student.email,
//       companyName: companyName,
//       internshipTitle: application?.internshipTitle || 'Direct Placement',
//       offerDetails: offerDetails || '',
//       package: salaryPackage || 'Not disclosed',
//       joiningDate: new Date(),
//       status: 'accepted'
//     });
    
//     await placement.save();
    
//     if (profile) {
//       profile.performanceScore = Math.min(profile.performanceScore + 15, 100);
//       await profile.save();
//     }
    
//     student.isPlaced = true;
//     student.placedCompany = companyName;
//     student.placedPackage = salaryPackage;
//     await student.save();
    
//     res.json({ 
//       message: 'Student hired successfully! Placement recorded.', 
//       placement 
//     });
//   } catch (error) {
//     console.error('Hire error:', error);
//     res.status(500).json({ message: 'Server error: ' + error.message });
//   }
// });



app.post('/api/company/hire', authMiddleware, async (req, res) => {
  try {
    // 1. Only companies can hire students
    if (req.userRole !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Company account required.'
      });
    }

    const { studentId, offerDetails, package: salaryPackage } = req.body;

    // 2. Validate student ID
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid student ID is required.'
      });
    }

    // 3. Verify the student exists and has the student role
    const student = await User.findOne({
      _id: studentId,
      role: 'student'
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    // 4. Prevent duplicate placements
    if (student.isPlaced) {
      return res.status(409).json({
        success: false,
        message: 'This student is already marked as placed.'
      });
    }

    // 5. Verify the logged-in company's profile
    const companyProfile = await CompanyProfile.findOne({
      userId: String(req.userId)
    });

    if (!companyProfile || !companyProfile.companyName?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your company profile before hiring.'
      });
    }

    const companyName = companyProfile.companyName.trim();

    // 6. Require an accepted application belonging to this company
    const acceptedApplications = await Application.find({
      studentId: String(student._id),
      companyName,
      status: 'accepted'
    }).sort({ appliedAt: -1 });

    let validApplication = null;

    for (const application of acceptedApplications) {
      const internship = await Internship.findOne({
        _id: application.internshipId,
        postedBy: String(req.userId),
        companyName
      });

      if (internship) {
        validApplication = application;
        break;
      }
    }

    if (!validApplication) {
      return res.status(403).json({
        success: false,
        message: 'The student must have an accepted application for an internship posted by your company.'
      });
    }

    // 7. Validate offer fields
    if (
      offerDetails !== undefined &&
      typeof offerDetails !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Offer details must be text.'
      });
    }

    if (
      salaryPackage !== undefined &&
      typeof salaryPackage !== 'string' &&
      typeof salaryPackage !== 'number'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Package must be text or a number.'
      });
    }

    const packageValue =
      salaryPackage === undefined || salaryPackage === null
        ? 'Not disclosed'
        : String(salaryPackage).trim();

    if (packageValue.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Package information is too long.'
      });
    }

    // 8. Create the placement record
    const placement = new Placement({
      studentId: String(student._id),
      studentName: student.name,
      studentEmail: student.email,
      companyName,
      internshipTitle: validApplication.internshipTitle,
      offerDetails: (offerDetails || '').trim(),
      package: packageValue,
      joiningDate: new Date(),
      status: 'accepted'
    });

    await placement.save();

    // 9. Update placement details on the student account
    student.isPlaced = true;
    student.placedCompany = companyName;
    student.placedPackage = packageValue;

    await student.save();

    return res.status(200).json({
      success: true,
      message: 'Student hired successfully. Placement recorded.',
      placement
    });
  } catch (error) {
    console.error('Hire student error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to record the placement.'
    });
  }
});



// ========== APPLICATION ROUTES ==========

app.post('/api/internships/:internshipId/apply', authMiddleware, async (req, res) => {
  try {
    // 1. Only students can apply
    if (req.userRole !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can apply for internships.'
      });
    }

    // 2. Validate internship ID
    if (!mongoose.Types.ObjectId.isValid(req.params.internshipId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid internship ID.'
      });
    }

    // 3. Find the internship
    const internship = await Internship.findById(
      req.params.internshipId
    );

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found.'
      });
    }

    // 4. Verify the student
    const student = await User.findOne({
      _id: req.userId,
      role: 'student'
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student account not found.'
      });
    }

    // 5. Prevent duplicate applications
    const existingApplication = await Application.findOne({
      internshipId: String(internship._id),
      studentId: String(req.userId)
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied for this internship.'
      });
    }

    // 6. Get student skills
    const studentProfile = await StudentProfile.findOne({
      userId: String(req.userId)
    });

    const studentSkills = studentProfile?.skills || [];
    const requiredSkills = internship.requiredSkills || [];

    // 7. Calculate an accurate skill match
    const skillMatch = calculateSkillMatch(
      studentSkills,
      requiredSkills
    );

    // 8. Create the application using server-side data
    const application = new Application({
      internshipId: String(internship._id),
      internshipTitle: internship.title,
      companyName: internship.companyName,
      studentId: String(req.userId),
      studentName: student.name,
      studentEmail: student.email,
      matchPercentage: skillMatch.matchPercentage,
      status: 'pending'
    });

    await application.save();

    // 9. Recalculate performance score
    await calculatePerformanceScore(String(req.userId));

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      matchPercentage: skillMatch.matchPercentage,
      matchedSkills: skillMatch.matchedSkills,
      missingSkills: skillMatch.missingSkills,
      application
    });
  } catch (error) {
    console.error('Internship application error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied for this internship.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to submit internship application.'
    });
  }
});


app.get('/api/student/applications', authMiddleware, async (req, res) => {
  const applications = await Application.find({ studentId: req.userId }).sort({ appliedAt: -1 });
  res.json(applications);
});

app.get('/api/company/applications', authMiddleware, async (req, res) => {
  const companyProfile = await CompanyProfile.findOne({ userId: req.userId });
  const companyName = companyProfile?.companyName || req.user.name;
  const applications = await Application.find({ companyName }).sort({ appliedAt: -1 });
  res.json(applications);
});

// app.put('/api/company/applications/:applicationId/status', authMiddleware, async (req, res) => {
//   const { status, notes } = req.body;
//   const application = await Application.findById(req.params.applicationId);
//   if (!application) return res.status(404).json({ message: 'Application not found' });
//   application.status = status;
//   if (notes) application.notes = notes;
//   await application.save();
//   await calculatePerformanceScore(application.studentId);
//   res.json({ message: `Application ${status}` });
// });



app.put(
  '/api/company/applications/:applicationId/status',
  authMiddleware,
  async (req, res) => {
    try {
      // Only companies can update application status
      if (req.userRole !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Company account required.'
        });
      }

      const { status, notes } = req.body;

      const allowedStatuses = [
        'pending',
        'reviewed',
        'shortlisted',
        'rejected',
        'accepted'
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid application status.'
        });
      }

      if (
        notes !== undefined &&
        typeof notes !== 'string'
      ) {
        return res.status(400).json({
          success: false,
          message: 'Notes must be a string.'
        });
      }

      const application = await Application.findById(
        req.params.applicationId
      );

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found.'
        });
      }

      // Verify the company profile
      const companyProfile = await CompanyProfile.findOne({
        userId: req.userId
      });

      if (!companyProfile) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found.'
        });
      }

      // Verify that this internship belongs to the logged-in company
      const internship = await Internship.findOne({
        _id: application.internshipId,
        postedBy: String(req.userId),
        companyName: companyProfile.companyName
      });

      if (!internship) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update this application.'
        });
      }

      application.status = status;

      if (notes !== undefined) {
        application.notes = notes.trim();
      }

      await application.save();

      await calculatePerformanceScore(application.studentId);

      return res.json({
        success: true,
        message: `Application status updated to ${status}.`,
        application
      });
    } catch (error) {
      console.error('Update application status error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to update application status.'
      });
    }
  }
);



// ========== INSTITUTE PLACEMENT ROUTES ==========
app.get('/api/institute/placements', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'institute') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const institute = await User.findById(req.userId);
    const instituteName = institute?.name;
    
    const students = await User.find({ 
      role: 'student', 
      instituteName: instituteName 
    }).select('_id name email');
    
    const studentIds = students.map(s => s._id.toString());
    
    const placements = await Placement.find({ 
      studentId: { $in: studentIds } 
    }).sort({ createdAt: -1 });
    
    const totalPlaced = placements.length;
    const totalStudents = students.length;
    const placementRate = totalStudents > 0 ? Math.round((totalPlaced / totalStudents) * 100) : 0;
    
    const companyWiseStats = {};
    placements.forEach(p => {
      if (!companyWiseStats[p.companyName]) {
        companyWiseStats[p.companyName] = { count: 0, students: [] };
      }
      companyWiseStats[p.companyName].count++;
      companyWiseStats[p.companyName].students.push(p.studentName);
    });
    
    const packages = placements.filter(p => p.package && p.package !== 'Not disclosed');
    let avgPackage = 0;
    if (packages.length > 0) {
      let sum = 0;
      packages.forEach(p => {
        const match = p.package.match(/\d+(?:\.\d+)?/);
        if (match) sum += parseFloat(match[0]);
      });
      avgPackage = sum / packages.length;
    }
    
    res.json({
      placements,
      statistics: {
        totalStudents,
        totalPlaced,
        placementRate,
        avgPackage: avgPackage.toFixed(1),
        companyWiseStats
      }
    });
  } catch (error) {
    console.error('Error fetching placements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/institute/placement-stats', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'institute') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const institute = await User.findById(req.userId);
    const instituteName = institute?.name;
    
    const students = await User.find({ role: 'student', instituteName: instituteName });
    const studentIds = students.map(s => s._id.toString());
    
    const placements = await Placement.find({ studentId: { $in: studentIds } });
    
    const yearWisePlacements = {};
    placements.forEach(p => {
      const year = new Date(p.createdAt).getFullYear();
      if (!yearWisePlacements[year]) {
        yearWisePlacements[year] = 0;
      }
      yearWisePlacements[year]++;
    });
    
    const topRecruiters = {};
    placements.forEach(p => {
      topRecruiters[p.companyName] = (topRecruiters[p.companyName] || 0) + 1;
    });
    
    const topRecruitersList = Object.entries(topRecruiters)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    res.json({
      totalStudents: students.length,
      totalPlaced: placements.length,
      placementRate: students.length > 0 ? Math.round((placements.length / students.length) * 100) : 0,
      yearWisePlacements,
      topRecruiters: topRecruitersList,
      recentPlacements: placements.slice(0, 10)
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== INSTITUTE STUDENT ROUTES ==========
// app.get('/api/institute/students', authMiddleware, async (req, res) => {
//   try {
//     const institute = await User.findById(req.userId);
//     const instituteName = institute?.name;
    
//     const students = await User.find({ role: 'student', instituteName: instituteName }).select('-password');
    
//     const studentsWithProfiles = await Promise.all(students.map(async (student) => {
//       const profile = await StudentProfile.findOne({ userId: student._id.toString() });
//       const tasks = await Task.find({ studentId: student._id.toString() });
//       const completedTasks = tasks.filter(t => t.status === 'reviewed');
//       const applications = await Application.countDocuments({ studentId: student._id.toString() });
      
//       return {
//         _id: student._id,
//         name: student.name,
//         email: student.email,
//         branch: profile?.branch || 'Not specified',
//         year: profile?.year || 'Not specified',
//         skills: profile?.skills || [],
//         performanceScore: profile?.performanceScore || 0,
//         isVerified: student.isVerified || false,
//         tasksCompleted: completedTasks.length,
//         totalTasks: tasks.length,
//         applicationsCount: applications,
//         isPlaced: student.isPlaced || false,
//         placedCompany: student.placedCompany || '',
//         placedPackage: student.placedPackage || ''
//       };
//     }));
    
//     res.json(studentsWithProfiles);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });






app.get('/api/institute/students', authMiddleware, async (req, res) => {
  try {
    // Only institute accounts can access this route
    const institute = await User.findOne({
      _id: req.userId,
      role: 'institute'
    });

    if (!institute) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Institute account required.'
      });
    }

    // Fetch only students associated with this institute
    const students = await User.find({
      role: 'student',
      instituteName: institute.name
    }).select('-password');

    const studentsWithProfiles = await Promise.all(
      students.map(async (student) => {
        const studentId = student._id.toString();

        const [profile, tasks, applicationsCount] = await Promise.all([
          StudentProfile.findOne({ userId: studentId }),
          Task.find({ studentId }),
          Application.countDocuments({ studentId })
        ]);

        const completedTasks = tasks.filter(
          task => task.status === 'reviewed'
        );

        return {
          _id: student._id,
          name: student.name,
          email: student.email,
          branch: profile?.branch || 'Not specified',
          year: profile?.year ?? 'Not specified',
          skills: profile?.skills || [],
          performanceScore: profile?.performanceScore || 0,
          isVerified: student.isVerified || false,
          tasksCompleted: completedTasks.length,
          totalTasks: tasks.length,
          applicationsCount,
          isPlaced: student.isPlaced || false,
          placedCompany: student.placedCompany || '',
          placedPackage: student.placedPackage || ''
        };
      })
    );

    // Keep the response as an array for frontend compatibility
    return res.status(200).json(studentsWithProfiles);

  } catch (error) {
    console.error('Institute students fetch error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch institute students.'
    });
  }
});


// app.put('/api/institute/verify/:studentId', authMiddleware, async (req, res) => {
//   await User.findByIdAndUpdate(req.params.studentId, { isVerified: true });
//   res.json({ message: 'Student verified' });
// });


app.put('/api/institute/verify/:studentId', authMiddleware, async (req, res) => {
  try {
    // 1. Only institute accounts can verify students
    if (req.userRole !== 'institute') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Institute account required.'
      });
    }

    const studentId = req.params.studentId;

    // 2. Validate student ID
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID.'
      });
    }

    // 3. Find the student
    const student = await User.findOne({
      _id: studentId,
      role: 'student'
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    // 4. Ensure the student belongs to this institute
    const institute = await User.findOne({
      _id: req.userId,
      role: 'institute'
    });

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute account not found.'
      });
    }

    if (
      !institute.name ||
      !student.instituteName ||
      institute.name.trim().toLowerCase() !==
        student.instituteName.trim().toLowerCase()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only verify students belonging to your institute.'
      });
    }

    // 5. Verify the student
    if (student.isVerified) {
      return res.json({
        success: true,
        message: 'Student is already verified.',
        studentId: String(student._id),
        isVerified: true
      });
    }

    student.isVerified = true;
    await student.save();

    return res.json({
      success: true,
      message: 'Student verified successfully.',
      studentId: String(student._id),
      isVerified: true
    });
  } catch (error) {
    console.error('Institute student verification error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to verify student.'
    });
  }
});


// app.put('/api/institute/profile', authMiddleware, async (req, res) => {
//   let profile = await InstituteProfile.findOne({ userId: req.userId });
//   if (profile) {
//     Object.assign(profile, req.body);
//     await profile.save();
//   } else {
//     profile = new InstituteProfile({ userId: req.userId, ...req.body });
//     await profile.save();
//   }
//   res.json(profile);
// });




app.put('/api/institute/profile', authMiddleware, async (req, res) => {
  try {
    // Only institute accounts can update institute profiles
    if (req.userRole !== 'institute') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Institute account required.'
      });
    }

    const allowedFields = [
      'instituteName',
      'address',
      'phone',
      'email',
      'website',
      'description'
    ];

    const updates = {};
    const unsupportedFields = Object.keys(req.body).filter(
      field => !allowedFields.includes(field)
    );

    if (unsupportedFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported profile fields.',
        fields: unsupportedFields
      });
    }

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string') {
          return res.status(400).json({
            success: false,
            message: `${field} must be a string.`
          });
        }

        updates[field] = req.body[field].trim();
      }
    }

    const institute = await User.findOne({
      _id: req.userId,
      role: 'institute'
    });

    if (!institute) {
      return res.status(403).json({
        success: false,
        message: 'Institute account not found.'
      });
    }

    let profile = await InstituteProfile.findOne({
      userId: String(req.userId)
    });

    if (!profile) {
      profile = new InstituteProfile({
        userId: String(req.userId),
        ...updates
      });
    } else {
      Object.assign(profile, updates);
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Institute profile updated successfully.',
      profile
    });
  } catch (error) {
    console.error('Institute profile update error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update institute profile.'
    });
  }
});


// app.get('/api/reports/placement', authMiddleware, async (req, res) => {
//   const internships = await Internship.find();
//   const students = await User.find({ role: 'student' });
//   const profiles = await StudentProfile.find();
//   const avgPerformance = profiles.reduce((sum, p) => sum + (p.performanceScore || 0), 0) / (profiles.length || 1);
  
//   res.json({
//     totalInternships: internships.length,
//     totalPlacements: Math.floor(students.length * 0.65),
//     placementRate: Math.floor(avgPerformance),
//     avgPerformance: Math.floor(avgPerformance),
//     internships
//   });
// });




app.get('/api/reports/placement', authMiddleware, async (req, res) => {
  try {
    const [internships, students, profiles] = await Promise.all([
      Internship.find(),
      User.find({ role: 'student' }).select(
        'isPlaced placedCompany placedPackage'
      ),
      StudentProfile.find().select('performanceScore')
    ]);

    const totalStudents = students.length;

    // Count actual placed students instead of estimating 65%
    const placedStudents = students.filter(
      student => student.isPlaced === true
    );

    const totalPlacements = placedStudents.length;

    const placementRate = totalStudents > 0
      ? Math.round((totalPlacements / totalStudents) * 100)
      : 0;

    const totalPerformance = profiles.reduce(
      (sum, profile) => sum + (profile.performanceScore || 0),
      0
    );

    const avgPerformance = profiles.length > 0
      ? Math.round(totalPerformance / profiles.length)
      : 0;

    return res.status(200).json({
      success: true,
      totalStudents,
      totalInternships: internships.length,
      totalPlacements,
      placementRate,
      avgPerformance,
      internships
    });
  } catch (error) {
    console.error('Placement report error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch placement report.'
    });
  }
});


// ========== COMPANY ROUTES ==========
app.get('/api/company/internships', authMiddleware, async (req, res) => {
  const company = await CompanyProfile.findOne({ userId: req.userId });
  const internships = await Internship.find({ companyName: company?.companyName });
  res.json(internships);
});

// app.get('/api/company/profile', authMiddleware, async (req, res) => {
//   const profile = await CompanyProfile.findOne({ userId: req.userId });
//   res.json(profile || {});
// });




app.get('/api/company/profile', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Company account required.'
      });
    }

    const profile = await CompanyProfile.findOne({
      userId: String(req.userId)
    });

    return res.status(200).json({
      success: true,
      profile: profile || null,
      message: profile
        ? 'Company profile fetched successfully.'
        : 'Company profile not created yet.'
    });
  } catch (error) {
    console.error('Get company profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch company profile.'
    });
  }
});


// app.put('/api/company/profile', authMiddleware, async (req, res) => {
//   let profile = await CompanyProfile.findOne({ userId: req.userId });
//   if (profile) {
//     Object.assign(profile, req.body);
//     await profile.save();
//   } else {
//     profile = new CompanyProfile({ userId: req.userId, ...req.body });
//     await profile.save();
//   }
//   res.json(profile);
// });




app.put('/api/company/profile', authMiddleware, async (req, res) => {
  try {
    // Only company accounts can update company profiles
    if (req.userRole !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Company account required.'
      });
    }

    const allowedFields = [
      'companyName',
      'industry',
      'location',
      'website',
      'description'
    ];

    const unsupportedFields = Object.keys(req.body).filter(
      field => !allowedFields.includes(field)
    );

    if (unsupportedFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported profile fields.',
        fields: unsupportedFields
      });
    }

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string') {
          return res.status(400).json({
            success: false,
            message: `${field} must be a string.`
          });
        }

        updates[field] = req.body[field].trim();
      }
    }

    const company = await User.findOne({
      _id: req.userId,
      role: 'company'
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Company account not found.'
      });
    }

    let profile = await CompanyProfile.findOne({
      userId: String(req.userId)
    });

    if (!profile) {
      profile = new CompanyProfile({
        userId: String(req.userId),
        ...updates
      });
    } else {
      Object.assign(profile, updates);
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Company profile updated successfully.',
      profile
    });
  } catch (error) {
    console.error('Company profile update error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update company profile.'
    });
  }
});


// ========== MENTOR ROUTES ==========
app.get('/api/mentor/students', authMiddleware, async (req, res) => {
  const students = await User.find({ role: 'student' }).select('-password');
  const studentsWithProfiles = await Promise.all(students.map(async (student) => {
    const profile = await StudentProfile.findOne({ userId: student._id.toString() });
    return {
      _id: student._id,
      name: student.name,
      email: student.email,
      branch: profile?.branch || 'Not specified',
      year: profile?.year || 'Not specified',
      skills: profile?.skills || [],
      performanceScore: profile?.performanceScore || 0
    };
  }));
  res.json(studentsWithProfiles);
});

// app.get('/api/mentor/profile', authMiddleware, async (req, res) => {
//   const profile = await MentorProfile.findOne({ userId: req.userId });
//   res.json(profile || {});
// });




app.get('/api/mentor/profile', authMiddleware, async (req, res) => {
  try {
    // Only mentors can access this endpoint
    if (req.userRole !== 'mentor') {
      return res.status(403).json({
        success: false,
        message: 'Only mentors can access mentor profiles.'
      });
    }

    // Fetch only the logged-in mentor's profile
    const profile = await MentorProfile.findOne({
      userId: String(req.userId)
    });

    if (!profile) {
      return res.status(200).json({
        success: true,
        profile: null,
        message: 'Mentor profile not created yet.'
      });
    }

    return res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Fetch mentor profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch mentor profile.'
    });
  }
});


// app.put('/api/mentor/profile', authMiddleware, async (req, res) => {
//   let profile = await MentorProfile.findOne({ userId: req.userId });
//   if (profile) {
//     Object.assign(profile, req.body);
//     await profile.save();
//   } else {
//     profile = new MentorProfile({ userId: req.userId, ...req.body });
//     await profile.save();
//   }
//   res.json(profile);
// });




app.put('/api/mentor/profile', authMiddleware, async (req, res) => {
  try {
    // 1. Only mentors can update mentor profiles
    if (req.userRole !== 'mentor') {
      return res.status(403).json({
        success: false,
        message: 'Only mentors can update mentor profiles.'
      });
    }

    // 2. Allow only fields defined in the mentor profile schema
    const allowedFields = [
      'expertise',
      'company',
      'position',
      'experience',
      'bio'
    ];

    const unsupportedFields = Object.keys(req.body).filter(
      field => !allowedFields.includes(field)
    );

    if (unsupportedFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported profile fields.',
        fields: unsupportedFields
      });
    }

    const updates = {};

    // 3. Validate expertise
    if (Object.hasOwn(req.body, 'expertise')) {
      if (
        !Array.isArray(req.body.expertise) ||
        !req.body.expertise.every(
          skill => typeof skill === 'string' && skill.trim().length > 0
        )
      ) {
        return res.status(400).json({
          success: false,
          message: 'Expertise must be an array of non-empty strings.'
        });
      }

      updates.expertise = [
        ...new Set(req.body.expertise.map(skill => skill.trim()))
      ];
    }

    // 4. Validate text fields
    for (const field of ['company', 'position', 'bio']) {
      if (Object.hasOwn(req.body, field)) {
        if (
          typeof req.body[field] !== 'string' ||
          req.body[field].length > (field === 'bio' ? 2000 : 150)
        ) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field} value.`
          });
        }

        updates[field] = req.body[field].trim();
      }
    }

    // 5. Validate experience
    if (Object.hasOwn(req.body, 'experience')) {
      const experience = req.body.experience;

      if (
        experience === '' ||
        experience === null
      ) {
        updates.experience = null;
      } else if (
        typeof experience !== 'number' ||
        !Number.isFinite(experience) ||
        experience < 0 ||
        experience > 60
      ) {
        return res.status(400).json({
          success: false,
          message: 'Experience must be a number between 0 and 60.'
        });
      } else {
        updates.experience = experience;
      }
    }

    // 6. Update only the logged-in mentor's profile
    let profile = await MentorProfile.findOne({
      userId: String(req.userId)
    });

    if (profile) {
      Object.assign(profile, updates);
    } else {
      profile = new MentorProfile({
        userId: String(req.userId),
        ...updates
      });
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Mentor profile updated successfully.',
      profile
    });
  } catch (error) {
    console.error('Mentor profile update error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update mentor profile.'
    });
  }
});


// app.post('/api/mentor/tasks', authMiddleware, async (req, res) => {
//   const task = new Task(req.body);
//   await task.save();
//   res.status(201).json(task);
// });

// app.get('/api/mentor/tasks', authMiddleware, async (req, res) => {
//   const tasks = await Task.find({ mentorId: req.userId });
//   res.json(tasks);
// });


app.get('/api/mentor/tasks', authMiddleware, async (req, res) => {
  try {
    // Only mentors can access their task list
    if (req.userRole !== 'mentor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Mentor account required.'
      });
    }

    // Fetch only tasks assigned to the logged-in mentor
    const tasks = await Task.find({
      mentorId: String(req.userId)
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    console.error('Fetch mentor tasks error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch mentor tasks.'
    });
  }
});




app.post('/api/mentor/tasks', authMiddleware, async (req, res) => {
  try {
    // 1. Only mentors can create tasks
    if (req.userRole !== 'mentor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Mentor account required.'
      });
    }

    const { title, description, studentId, dueDate } = req.body;

    // 2. Validate required fields
    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof description !== 'string' ||
      !description.trim() ||
      typeof studentId !== 'string' ||
      !studentId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and student ID are required.'
      });
    }

    // 3. Verify that the selected user exists and is a student
    if (!mongoose.Types.ObjectId.isValid(studentId.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID.'
      });
    }

    const student = await User.findOne({
      _id: studentId.trim(),
      role: 'student'
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    // 4. Validate optional due date
    let parsedDueDate;

    if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
      parsedDueDate = new Date(dueDate);

      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid due date.'
        });
      }

      if (parsedDueDate.getTime() < Date.now()) {
        return res.status(400).json({
          success: false,
          message: 'Due date cannot be in the past.'
        });
      }
    }

    // 5. Set trusted fields on the server, not from the request body
    const task = new Task({
      title: title.trim(),
      description: description.trim(),
      studentId: String(student._id),
      mentorId: String(req.userId),
      ...(parsedDueDate ? { dueDate: parsedDueDate } : {})
    });

    await task.save();

    return res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      task
    });
  } catch (error) {
    console.error('Create mentor task error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create task.'
    });
  }
});


// app.put('/api/mentor/tasks/:taskId/review', authMiddleware, async (req, res) => {
//   const { score, feedback } = req.body;
//   const task = await Task.findById(req.params.taskId);
//   task.score = score;
//   task.feedback = feedback;
//   task.status = 'reviewed';
//   await task.save();
//   await calculatePerformanceScore(task.studentId);
//   res.json({ message: 'Task reviewed' });
// });




app.put('/api/mentor/tasks/:taskId/review', authMiddleware, async (req, res) => {
  try {
    // 1. Only mentors can review tasks
    if (req.userRole !== 'mentor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Mentor account required.'
      });
    }

    const { score, feedback } = req.body;

    // 2. Validate score
    if (
      score === undefined ||
      score === null ||
      score === '' ||
      !Number.isFinite(Number(score)) ||
      Number(score) < 0 ||
      Number(score) > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Score must be a number between 0 and 100.'
      });
    }

    // 3. Validate feedback
    if (feedback !== undefined && typeof feedback !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Feedback must be a string.'
      });
    }

    // 4. Find the task assigned to this mentor
    const task = await Task.findOne({
      _id: req.params.taskId,
      mentorId: String(req.userId)
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or you are not authorized to review it.'
      });
    }

    // 5. Review only tasks submitted by students
    if (task.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Only submitted tasks can be reviewed.'
      });
    }

    // 6. Save the review
    task.score = Number(score);
    task.feedback = feedback === undefined ? '' : feedback.trim();
    task.status = 'reviewed';

    await task.save();

    // 7. Recalculate the student's performance score
    await calculatePerformanceScore(task.studentId);

    return res.json({
      success: true,
      message: 'Task reviewed successfully.',
      task
    });
  } catch (error) {
    console.error('Mentor task review error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to review task.'
    });
  }
});


// ========== STUDENT TASK ROUTES ==========
// app.get('/api/student/tasks', authMiddleware, async (req, res) => {
//   const tasks = await Task.find({ studentId: req.userId });
//   res.json(tasks);
// });




app.get('/api/student/tasks', authMiddleware, async (req, res) => {
  try {
    // 1. Only students can access this endpoint
    if (req.userRole !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Student account required.'
      });
    }

    // 2. Fetch only tasks assigned to the logged-in student
    const tasks = await Task.find({
      studentId: String(req.userId)
    }).sort({ createdAt: -1 });

    // Keep the response as an array for frontend compatibility
    return res.json(tasks);
  } catch (error) {
    console.error('Fetch student tasks error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student tasks.'
    });
  }
});


// app.put('/api/student/tasks/:taskId/submit', authMiddleware, async (req, res) => {
//   const { submissionUrl } = req.body;
//   const task = await Task.findById(req.params.taskId);
//   if (!task) return res.status(404).json({ message: 'Task not found' });
//   task.status = 'submitted';
//   task.submissionUrl = submissionUrl;
//   await task.save();
//   res.json({ message: 'Task submitted' });
// });




app.put(
  '/api/student/tasks/:taskId/submit',
  authMiddleware,
  async (req, res) => {
    try {
      // Only students can submit tasks
      if (req.userRole !== 'student') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Student account required.'
        });
      }

      const { submissionUrl } = req.body;

      // Validate submission URL
      if (
        typeof submissionUrl !== 'string' ||
        !submissionUrl.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'A valid submission URL is required.'
        });
      }

      let parsedUrl;

      try {
        parsedUrl = new URL(submissionUrl.trim());
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid URL.'
        });
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({
          success: false,
          message: 'Only HTTP and HTTPS URLs are allowed.'
        });
      }

      // Find task assigned to the logged-in student only
      const task = await Task.findOne({
        _id: req.params.taskId,
        studentId: String(req.userId)
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found or not assigned to you.'
        });
      }

      // Prevent resubmission after mentor review
      if (task.status === 'reviewed') {
        return res.status(400).json({
          success: false,
          message: 'This task has already been reviewed.'
        });
      }

      task.submissionUrl = parsedUrl.toString();
      task.status = 'submitted';

      await task.save();

      return res.json({
        success: true,
        message: 'Task submitted successfully.',
        task
      });
    } catch (error) {
      console.error('Submit task error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to submit task.'
      });
    }
  }
);


// ========== OTHER ROUTES ==========
app.get('/api/company-logo/:name', (req, res) => {
  res.json({ logo: `https://logo.clearbit.com/${req.params.name.toLowerCase()}.com` });
});

// ========== SAMPLE DATA ==========
const sampleInternships = [
  { title: "Frontend Developer Intern", companyName: "Google", description: "React.js internship", location: "Bangalore", salary: "₹40,000/month", requiredSkills: ["React", "JavaScript"] },
  { title: "Backend Developer Intern", companyName: "Microsoft", description: "Node.js internship", location: "Hyderabad", salary: "₹45,000/month", requiredSkills: ["Node.js", "Express"] },
  { title: "Full Stack Intern", companyName: "Amazon", description: "React + Node.js", location: "Bangalore", salary: "₹50,000/month", requiredSkills: ["React", "Node.js"] }
];

const initDB = async () => {
  const count = await User.countDocuments();
  if (count === 0) {
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const institute = new User({ name: 'IIT Delhi', email: 'institute@test.com', password: hashedPassword, role: 'institute' });
    await institute.save();
    await new InstituteProfile({ userId: institute._id.toString(), instituteName: 'IIT Delhi' }).save();
    
    const student = new User({ name: 'John Student', email: 'student@test.com', password: hashedPassword, role: 'student', instituteName: 'IIT Delhi' });
    await student.save();
    await new StudentProfile({ userId: student._id.toString(), skills: ['React', 'Node.js', 'Python'], profileComplete: true }).save();
    await calculatePerformanceScore(student._id.toString());
    
    const company = new User({ name: 'Google', email: 'company@test.com', password: hashedPassword, role: 'company' });
    await company.save();
    await new CompanyProfile({ userId: company._id.toString(), companyName: 'Google' }).save();
    
    const mentor = new User({ name: 'Dr. Smith', email: 'mentor@test.com', password: hashedPassword, role: 'mentor' });
    await mentor.save();
    await new MentorProfile({ userId: mentor._id.toString() }).save();
    
    await Internship.insertMany(sampleInternships);
    console.log('✅ Test data created');
  }
};

setTimeout(initDB, 2000);



// ========== AI COMPANY RECOMMENDATIONS ==========

// ========== AI COMPANY RECOMMENDATIONS (UPDATED) ==========

app.get('/api/ai/company-recommendations', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'student') {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Get student data
    const studentProfile = await StudentProfile.findOne({
      userId: req.userId
    });

    const student = await User.findById(req.userId);
    const studentSkills = studentProfile?.skills || [];

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (studentSkills.length === 0) {
      return res.json({
        success: true,
        message: 'Add skills to your profile to get recommendations',
        recommendations: [],
        studentSkills: [],
        totalCompanies: 0,
        careerInsights: {
          suggestions: ['Add skills to get personalized suggestions'],
          careerPath: 'Add skills to get career insights'
        }
      });
    }

    // Get companies, internships and applications
    const companies = await CompanyProfile.find({});
    const allInternships = await Internship.find({});
    const applications = await Application.find({
      studentId: req.userId
    });

    const companyScores = [];

    for (const company of companies) {
      const companyInternships = allInternships.filter(
        (internship) =>
          internship.companyName === company.companyName
      );

      if (companyInternships.length === 0) {
        continue;
      }

      // Collect unique required skills
      const requiredSkills = [];

      companyInternships.forEach((internship) => {
        (internship.requiredSkills || []).forEach((skill) => {
          if (
            !requiredSkills.some(
              (existingSkill) =>
                String(existingSkill).trim().toLowerCase() ===
                String(skill).trim().toLowerCase()
            )
          ) {
            requiredSkills.push(skill);
          }
        });
      });

      // Calculate skill match
      const match = calculateSkillMatch(
        studentSkills,
        requiredSkills
      );

      const matchPercentage = match.matchPercentage;
      const missingSkills = match.missingSkills;

      // Generate recommendations and career insights
      const suggestions = generateAISuggestions(
        matchPercentage,
        missingSkills,
        company.companyName,
        studentSkills
      );

      const careerInsight = generateCareerInsight(
        studentSkills,
        company.companyName,
        matchPercentage
      );

      companyScores.push({
        companyName: company.companyName,
        matchScore: matchPercentage,
        matchedSkills: match.matchedCount,
        totalSkills: match.totalRequiredSkills,
        missingSkills: missingSkills.slice(0, 5),
        internships: companyInternships.length,
        skills: requiredSkills.slice(0, 8),
        industry: company.industry || 'Technology',
        location: company.location || 'India',
        suggestions,
        careerInsight,
        learningResources: generateLearningResources(missingSkills),
        growthPotential: calculateGrowthPotential(
          matchPercentage,
          companyInternships.length
        )
      });
    }

    // Sort and get top 5 recommendations
    const sortedRecommendations = companyScores
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    // Mark companies the student has already applied to
    const appliedCompanies = applications.map(
      (application) => application.companyName
    );

    sortedRecommendations.forEach((recommendation) => {
      recommendation.alreadyApplied = appliedCompanies.includes(
        recommendation.companyName
      );
    });

    // Generate overall student career insights
    const careerInsights = generateStudentCareerInsights(
      studentSkills,
      sortedRecommendations
    );

    res.json({
      success: true,
      studentSkills,
      recommendations: sortedRecommendations,
      careerInsights,
      totalCompanies: companies.length,
      message: sortedRecommendations.length > 0
        ? '🎯 AI found companies matching your skills!'
        : 'No companies match your skills. Add more skills to your profile.'
    });

  } catch (error) {
    console.error('AI Recommendation error:', error);

    res.status(500).json({
      success: false,
      message: 'Error generating recommendations',
      error: error.message
    });
  }
});


// ========== 🆕 AI SUGGESTIONS GENERATOR ==========
function generateAISuggestions(matchScore, missingSkills, companyName, studentSkills) {
  const suggestions = [];

  // 1. Skill-based suggestions
  if (missingSkills.length > 0) {
    suggestions.push({
      type: 'skill_gap',
      title: `💡 Learn these skills for ${companyName}`,
      description: `To increase your chances at ${companyName}, learn: ${missingSkills.slice(0, 3).join(', ')}`,
      priority: matchScore < 60 ? 'high' : 'medium'
    });
  }

  // 2. Improvement suggestions
  if (matchScore < 50) {
    suggestions.push({
      type: 'improvement',
      title: '📚 Focus on upskilling',
      description: `Your current match is ${matchScore}%. Consider learning in-demand skills.`,
      priority: 'high'
    });
  }

  // 3. Application suggestions
  if (studentSkills.length > 0) {
    suggestions.push({
      type: 'application_tips',
      title: '📝 Application Tips',
      description: `Highlight your ${studentSkills.slice(0, 2).join(' and ')} skills in your application for ${companyName}.`,
      priority: 'medium'
    });
  }

  // 4. Career growth suggestion
  if (matchScore >= 70) {
    suggestions.push({
      type: 'career_growth',
      title: '🚀 You are a great fit!',
      description: `With ${matchScore}% match, you have strong chances at ${companyName}. Apply now!`,
      priority: 'high'
    });
  }

  return suggestions;
}

// ========== 🆕 CAREER INSIGHT GENERATOR ==========
function generateCareerInsight(studentSkills, companyName, matchScore) {
  if (studentSkills.length === 0) {
    return {
      title: '📝 Start Your Career Journey',
      description: 'Add skills to get personalized career insights.',
      nextSteps: ['Add 3+ skills to your profile']
    };
  }

  const insights = {
    title: `🎯 ${companyName} Career Insight`,
    description: `Based on your skills, you are a ${matchScore >= 70 ? 'strong' : 'good'} candidate for ${companyName}.`,
    nextSteps: []
  };

  if (matchScore >= 70) {
    insights.nextSteps.push('✅ Apply now - you are highly recommended!');
    insights.nextSteps.push('📝 Tailor your resume for this role');
  } else if (matchScore >= 50) {
    insights.nextSteps.push('📚 Learn recommended skills');
    insights.nextSteps.push('📝 Update your profile with more details');
  } else {
    insights.nextSteps.push('💪 Focus on skill development');
    insights.nextSteps.push('🎯 Look for internships with lower requirements');
  }

  return insights;
}

// ========== 🆕 LEARNING RESOURCES GENERATOR ==========
function generateLearningResources(missingSkills) {
  const resources = [];
  
  missingSkills.slice(0, 3).forEach(skill => {
    resources.push({
      skill: skill,
      courses: [
        `📚 Learn ${skill} on Coursera`,
        `📺 Watch ${skill} tutorials on YouTube`,
        `💻 Practice ${skill} on Codecademy`
      ]
    });
  });

  return resources;
}

// ========== 🆕 GROWTH POTENTIAL CALCULATOR ==========
function calculateGrowthPotential(matchScore, internshipsCount) {
  let potential = {
    level: '',
    description: '',
    score: 0
  };

  if (matchScore >= 70 && internshipsCount >= 3) {
    potential.level = 'High';
    potential.score = 90;
    potential.description = 'Excellent growth opportunities available';
  } else if (matchScore >= 50 && internshipsCount >= 2) {
    potential.level = 'Medium';
    potential.score = 65;
    potential.description = 'Good growth potential with upskilling';
  } else {
    potential.level = 'Low';
    potential.score = 40;
    potential.description = 'Focus on skill development for better opportunities';
  }

  return potential;
}

// ========== 🆕 STUDENT CAREER INSIGHTS ==========
function generateStudentCareerInsights(studentSkills, recommendations) {
  if (recommendations.length === 0) {
    return {
      summary: '📝 Add skills to get AI career insights',
      topSkillsToLearn: [],
      careerPath: 'Add skills to get started',
      suggestions: ['Add 3+ skills to your profile']
    };
  }

  // Find most common missing skills
  const missingSkillsMap = {};
  recommendations.forEach(rec => {
    rec.missingSkills.forEach(skill => {
      missingSkillsMap[skill] = (missingSkillsMap[skill] || 0) + 1;
    });
  });

  const topSkillsToLearn = Object.entries(missingSkillsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill]) => skill);

  // Generate summary
  let summary = '';
  const avgScore = recommendations.reduce((sum, r) => sum + r.matchScore, 0) / recommendations.length;
  
  if (avgScore >= 70) {
    summary = '🌟 You are ready for top companies! Your skills match well with industry requirements.';
  } else if (avgScore >= 50) {
    summary = '📚 You are on the right track! Learn recommended skills to reach top companies.';
  } else {
    summary = '💪 Start by learning in-demand skills. Focus on building a strong foundation.';
  }

  // Career path suggestion
  let careerPath = '';
  const topSkill = studentSkills[0] || '';
  
  if (topSkill.includes('React') || topSkill.includes('JavaScript')) {
    careerPath = 'Frontend Developer → Full Stack Developer → Senior Engineer';
  } else if (topSkill.includes('Node.js') || topSkill.includes('Python')) {
    careerPath = 'Backend Developer → Full Stack Developer → Technical Lead';
  } else if (topSkill.includes('Data') || topSkill.includes('ML')) {
    careerPath = 'Data Analyst → Data Scientist → AI Engineer';
  } else if (topSkill.includes('Design') || topSkill.includes('UI')) {
    careerPath = 'UI/UX Designer → Product Designer → Design Lead';
  } else {
    careerPath = 'Software Developer → Senior Developer → Tech Lead';
  }

  return {
    summary: summary,
    topSkillsToLearn: topSkillsToLearn,
    careerPath: careerPath,
    suggestions: topSkillsToLearn.length > 0 
      ? [`Learn ${topSkillsToLearn.slice(0, 3).join(', ')} to match with top companies!`]
      : ['Keep building your skills']
  };
}


// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`\n📋 TEST CREDENTIALS:`);
  console.log(`   Student:   student@test.com   / 123456`);
  console.log(`   Company:   company@test.com   / 123456`);
  console.log(`   Institute: institute@test.com / 123456`);
  console.log(`   Mentor:    mentor@test.com    / 123456\n`);
});