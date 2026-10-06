# AI-Powered Job Matching Platform - Design Style Guide

## Design Philosophy

### Visual Language
- **Minimalist Premium Aesthetic**: Clean, sophisticated design that conveys trust and professionalism
- **SaaS-First Approach**: Interface designed for productivity and efficiency
- **AI-Enhanced Experience**: Subtle technological sophistication without overwhelming complexity
- **Human-Centered Design**: Warm, approachable interface that reduces job search anxiety

### Color Palette
- **Primary Blue**: #2563EB (Professional, trustworthy, modern)
- **Light Blue**: #DBEAFE (Soft accents, hover states)
- **Pure White**: #FFFFFF (Clean backgrounds, cards)
- **Soft Gray**: #F8FAFC (Section backgrounds, subtle divisions)
- **Text Colors**: #1F2937 (Primary), #6B7280 (Secondary)

### Typography
- **Display Font**: Inter (Bold weights for headings, modern and readable)
- **Body Font**: Inter (Regular and medium weights for content)
- **Monospace**: JetBrains Mono (For code snippets and technical data)
- **Hierarchy**: Large headings (32px+), medium subheadings (20px), body text (14-16px)

## Visual Effects & Styling

### Core Libraries Used
1. **Anime.js**: Smooth micro-interactions and progress bar animations
2. **ECharts.js**: Professional data visualization for match scores and analytics
3. **Pixi.js**: Subtle particle effects for background ambiance
4. **Typed.js**: Dynamic text effects for AI-generated content
5. **Splide.js**: Elegant carousels for job recommendations
6. **Splitting.js**: Advanced text animations for headings
7. **Matter.js**: Physics-based interactions for drag & drop CV upload

### Animation Strategy
- **Micro-interactions**: Subtle hover effects, button states, form interactions
- **Progress Indicators**: Animated progress bars for job match percentages
- **Loading States**: Elegant skeleton screens and loading animations
- **Page Transitions**: Smooth navigation between dashboard sections

### Header & Navigation Effects
- **Glassmorphism Navigation**: Semi-transparent sidebar with backdrop blur
- **Active State Indicators**: Smooth sliding indicators for current page
- **Icon Animations**: Subtle hover effects on navigation icons
- **Search Animation**: Expanding search bar with smooth transitions

### Card Design System
- **Rounded Corners**: 12px border radius for modern, friendly appearance
- **Soft Shadows**: Subtle drop shadows (0 4px 6px rgba(0,0,0,0.05))
- **Hover States**: Gentle lift effect with increased shadow
- **Content Hierarchy**: Clear visual separation between card sections

### Interactive Elements
- **Button Styles**: Rounded, gradient backgrounds with smooth hover transitions
- **Form Fields**: Clean borders, focus states with blue accent
- **Progress Bars**: Animated fill with gradient overlays
- **Toggle Switches**: Smooth sliding animations for settings

### Background Treatment
- **Consistent Base**: Solid white background throughout all pages
- **Subtle Texture**: Very light grid pattern overlay (opacity: 0.02)
- **Section Dividers**: Minimal gray lines and spacing for content separation
- **No Gradients**: Maintaining clean, flat design aesthetic

### Data Visualization Style
- **Match Score Charts**: Clean progress bars with blue gradients
- **Analytics Dashboard**: Minimalist charts with consistent blue palette
- **Compatibility Meters**: Circular progress indicators with smooth animations
- **Skills Radar**: Subtle radar charts for candidate-job matching

### Responsive Design
- **Mobile-First**: Touch-friendly interactions and spacing
- **Flexible Grid**: CSS Grid and Flexbox for adaptive layouts
- **Scalable Typography**: Fluid font sizes based on viewport
- **Adaptive Navigation**: Collapsible sidebar for mobile devices

### Accessibility Features
- **High Contrast**: 4.5:1 minimum contrast ratio for all text
- **Focus Indicators**: Clear keyboard navigation states
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Motion Preferences**: Respect user's reduced motion settings