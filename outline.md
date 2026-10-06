# AI-Powered Job Matching Platform - Project Outline

## File Structure

```
/mnt/okcomputer/output/
├── index.html              # Home dashboard with CV upload and job matches
├── auto-apply.html         # Cover letter generation and application dashboard  
├── recruiter.html          # Recruiter dashboard with candidate rankings
├── main.js                 # Core JavaScript functionality and interactions
└── resources/              # Local assets and media files
    ├── hero-bg.jpg         # Abstract professional hero background
    ├── office-1.jpg        # Modern office workspace image
    ├── office-2.jpg        # Professional team collaboration image
    ├── dashboard-ui.jpg    # SaaS interface reference image
    ├── candidate-1.jpg     # Professional headshot 1
    ├── candidate-2.jpg     # Professional headshot 2
    ├── candidate-3.jpg     # Professional headshot 3
    ├── company-1.jpg       # Company office image 1
    ├── company-2.jpg       # Company office image 2
    └── analytics-bg.jpg    # Data visualization background
```

## Page Breakdown

### 1. index.html - Job Seeker Dashboard
**Purpose**: Primary interface for job seekers with CV upload and job matching

**Sections**:
- **Navigation Header**: Collapsible sidebar with logo and main navigation
- **Hero Section**: Compact intro with abstract background image (1/5 screen height)
- **CV Upload Zone**: Drag & drop area with file browser fallback
- **Job Match Results**: Grid of job cards with compatibility percentages
- **AI Insights Panel**: Recommendations for improving match scores
- **Filter Sidebar**: Industry, location, salary range filters
- **Quick Actions**: Save jobs, apply later, view details buttons

**Interactive Components**:
- Drag & drop CV upload with visual feedback
- Animated progress bars for match percentages
- Real-time filtering and sorting of job listings
- Expandable job detail cards

### 2. auto-apply.html - Application Dashboard  
**Purpose**: Cover letter generation and automated application management

**Sections**:
- **Navigation Header**: Consistent sidebar navigation
- **Job Details Card**: Selected job information with key highlights
- **Cover Letter Generator**: AI-generated text with editing capabilities
- **Application Tracker**: Progress indicators for application status
- **Template Selector**: Different cover letter styles and formats
- **Bulk Apply Manager**: Multi-select interface for batch applications
- **History Panel**: Previous applications and their outcomes

**Interactive Components**:
- Rich text editor for cover letter customization
- Template switching with live preview
- Application status tracking with visual indicators
- Batch selection and bulk apply functionality

### 3. recruiter.html - Recruiter Dashboard
**Purpose**: Candidate ranking and AI-powered screening interface

**Sections**:
- **Navigation Header**: Recruiter-specific navigation options
- **Job Posting Manager**: Active job listings with performance metrics
- **Candidate Ranking Table**: Sortable list with AI compatibility scores
- **CV Summary Cards**: Quick candidate preview with AI insights
- **Search & Filter Panel**: Advanced filtering by skills, experience
- **Interview Scheduler**: Calendar integration for candidate meetings
- **Analytics Dashboard**: Charts showing hiring pipeline metrics

**Interactive Components**:
- Sortable candidate table with real-time updates
- Expandable CV summary cards with detailed insights
- Advanced search with multiple filter criteria
- Interview scheduling with calendar integration

## Technical Implementation

### Core JavaScript (main.js)
- **Navigation System**: Sidebar toggle, active page management
- **CV Upload Handler**: Drag & drop, file validation, progress tracking
- **Job Matching Logic**: Mock AI algorithms for compatibility scoring
- **Data Visualization**: ECharts integration for progress bars and analytics
- **Form Validation**: Real-time validation for all input fields
- **Animation Controllers**: Anime.js integration for smooth interactions
- **Local Storage**: Save user preferences and application state

### Visual Effects Integration
- **Anime.js**: Progress bar animations, button interactions, page transitions
- **ECharts.js**: Match percentage charts, analytics visualizations
- **Pixi.js**: Subtle background particle effects for premium feel
- **Typed.js**: Dynamic text for AI-generated content
- **Splide.js**: Job recommendation carousels and image galleries
- **Splitting.js**: Advanced heading animations and text effects

### Data Management
- **Mock Job Database**: 20+ sample job listings with detailed information
- **Candidate Profiles**: 15+ professional profiles with photos and details
- **Application State**: Track application status and progress
- **User Preferences**: Save filter settings and dashboard layout
- **Analytics Data**: Mock metrics for recruiter dashboard charts

### Responsive Design
- **Mobile Navigation**: Collapsible sidebar with hamburger menu
- **Flexible Grid**: CSS Grid for dashboard layout adaptation
- **Touch Interactions**: Mobile-friendly drag & drop and swiping
- **Adaptive Typography**: Fluid font scaling for different screen sizes

## Content Strategy

### Professional Imagery
- **Hero Backgrounds**: Abstract, professional, non-distracting
- **Office Environments**: Modern workspaces to convey company culture
- **Professional Headshots**: Diverse, high-quality candidate photos
- **SaaS Interface Elements**: Clean dashboard screenshots for credibility

### Copy & Messaging
- **AI-Powered Features**: Emphasize intelligent matching and automation
- **Professional Tone**: Confident, trustworthy, results-oriented
- **User Benefits**: Focus on time-saving, better matches, reduced effort
- **Technical Sophistication**: Subtle references to advanced algorithms

### Data Visualization
- **Match Scores**: Clear percentage indicators with color coding
- **Progress Tracking**: Visual application pipeline status
- **Analytics Charts**: Clean, professional data presentation
- **Comparison Tools**: Side-by-side candidate and job evaluations