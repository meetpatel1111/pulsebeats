# Contributing to PulseBeats

Thank you for your interest in contributing to PulseBeats! This document provides guidelines and instructions for setting up the development environment.

## Development Setup

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Git

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/pulsebeats/pulsebeats.git
   cd pulsebeats
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

3. Start the development server:
   ```
   npm run dev
   ```
   or
   ```
   yarn dev
   ```

## Project Structure

```
pulsebeats/
├── assets/              # Static assets (icons, images)
├── src/
│   ├── components/      # React components
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── services/        # Service modules
│   ├── styles/          # CSS/SCSS files
│   ├── utils/           # Utility functions
│   ├── App.js           # Main React component
│   └── index.js         # Entry point
├── main.js              # Electron main process
├── preload.js           # Electron preload script
└── package.json         # Project configuration
```

## Feature Implementation Guidelines

When implementing new features, please follow these guidelines:

1. Create a new branch for your feature:
   ```
   git checkout -b feature/your-feature-name
   ```

2. Follow the coding style and patterns used in the project
3. Write tests for your feature
4. Update documentation as needed
5. Submit a pull request with a clear description of your changes

## Core Feature Categories

When contributing, consider which feature category your work falls under:

1. Playback Features
2. Library Management
3. Audio Features
4. Modern UI/UX
5. AI & Smart Features
6. Streaming & Online Features
7. Offline Support & Portability
8. User Customization
9. Security & Privacy
10. Advanced Controls & Utilities
11. Community & Social
12. Developer/Power-User Tools

## Code Style

- Use ESLint and Prettier for code formatting
- Follow React best practices
- Write meaningful comments
- Use TypeScript for type safety

## Testing

- Write unit tests for utility functions
- Write component tests for UI components
- Test across multiple platforms when possible

## License

By contributing to PulseBeats, you agree that your contributions will be licensed under the project's MIT License.