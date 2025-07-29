
# Advanced QA Test-Plan Generator

An intelligent application that analyzes Product Requirements Documents (PRDs), UI designs, and videos to identify gaps and automatically generate comprehensive QA test plans, including Markdown tables and Gherkin scenarios, using the Gemini API.

## Features

- **PRD, Design, and Video Input:** Upload PRDs, Figma links, images, and videos for holistic analysis.
- **AI-Powered Analysis:** Uses Gemini API to find logical gaps, UI/UX issues, and accessibility problems.
- **Test Plan Generation:** Automatically creates detailed test cases in Markdown and Gherkin formats.
- **Traceability Matrix:** Maps requirements/user stories to test cases for coverage.
- **QA Documentation:** Generates comprehensive QA docs for sharing and download.
- **Modern UI:** Built with React, Vite, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Gemini API Key (Google GenAI)

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/hiran1020/advanced-qa-test-plan-generator--3-.git
   cd advanced-qa-test-plan-generator--3-
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure API Key:**
   - Create a `.env.local` file in the root directory.
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your-gemini-api-key
     ```

### Running Locally

```sh
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```sh
npm run build
```

## Usage

1. **Input PRD, Figma URL, or upload files.**
2. **Review AI analysis for gaps and ambiguities.**
3. **Generate and prioritize the test plan.**
4. **View test cases, Gherkin scenarios, and traceability matrix.**
5. **Download QA documentation as Markdown.**

## Project Structure

- `App.tsx` - Main application logic and routing.
- `components/` - UI and feature components (TestPlanDisplay, PRDInput, AnalysisResults, etc.).
- `services/geminiService.ts` - Handles communication with Gemini API.
- `types.ts` - TypeScript types and interfaces.
- `constants.tsx` - System instructions and schemas for AI.
- `index.html` - Main HTML entry point.
- `package.json` - Project dependencies and scripts.

## Technologies

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Gemini API (Google GenAI)
- React Markdown

