

import { GoogleGenAI, Part } from "@google/genai";
import type { Analysis, AnalysisFinding, TestPlan, TestCase, InputData, FileData, TraceabilityMatrix } from '../types';
import { Step } from '../types';
import { 
    GEMINI_MODEL, 
    ANALYSIS_SYSTEM_INSTRUCTION, 
    ANALYSIS_RESPONSE_SCHEMA,
    TEST_PLAN_SYSTEM_INSTRUCTION,
    TEST_PLAN_RESPONSE_SCHEMA,
    CONSOLIDATE_SYSTEM_INSTRUCTION,
    PRIORITIZATION_SYSTEM_INSTRUCTION,
    PRIORITIZATION_RESPONSE_SCHEMA,
    TRACEABILITY_SYSTEM_INSTRUCTION,
    TRACEABILITY_RESPONSE_SCHEMA,
    QA_DOCS_GENERATION_INSTRUCTION
} from '../constants';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set. Please set it in your environment.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface PrioritizedCase {
    test_case_id: string;
    priority: string;
    reasoning: string;
}

interface PrioritizationResponse {
    prioritized_cases: PrioritizedCase[];
}


// --- Helper function to parse markdown table into structured TestCase objects ---
const parseMarkdownTable = (markdown: string): Omit<TestCase, 'priority' | 'priority_reasoning'>[] => {
    try {
        const lines = markdown.trim().split('\n').filter(line => line.trim().startsWith('|') && !line.includes('---'));
        if (lines.length < 2) return [];

        const headerLine = lines[0];
        const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean);
        const headerMap: { [key: string]: number } = {
            'Test Case ID': headers.indexOf('Test Case ID'),
            'Test Type': headers.indexOf('Test Type'),
            'Summary': headers.indexOf('Summary'),
            'Preconditions': headers.indexOf('Preconditions'),
            'Test Steps': headers.indexOf('Test Steps'),
            'Expected Result': headers.indexOf('Expected Result'),
            'Story ID': headers.indexOf('Story ID'),
            'Risk Type': headers.indexOf('Risk Type'),
        };
        
        if (Object.values(headerMap).some(v => v === -1)) {
            console.error("Markdown table parsing error: One or more headers not found", headers);
            return [];
        }
        
        const rows = lines.slice(1);

        return rows.map(row => {
            const cells = row.split('|').map(cell => cell.trim()).filter(Boolean);
            return {
                id: cells[headerMap['Test Case ID']] || 'N/A',
                type: cells[headerMap['Test Type']] || 'N/A',
                summary: cells[headerMap['Summary']] || 'No summary',
                preconditions: cells[headerMap['Preconditions']] || 'None',
                steps: cells[headerMap['Test Steps']] || 'N/A',
                expectedResult: cells[headerMap['Expected Result']] || 'N/A',
                storyId: cells[headerMap['Story ID']] || 'N/A',
                risk: cells[headerMap['Risk Type']] || 'N/A',
            };
        });
    } catch (error) {
        console.error("Failed to parse markdown table:", error);
        return [];
    }
};

function buildMultimodalPrompt(inputs: InputData, additionalContext?: string): Part[] {
    const parts: Part[] = [];
    let textPrompt = '';

    if (inputs.prdText) {
        textPrompt += `Here is the PRD to analyze:\n\n---\n\n${inputs.prdText}\n\n`;
    }
    if (inputs.figmaUrl) {
        textPrompt += `The following Figma design is also relevant: ${inputs.figmaUrl}\n\n`;
    }
    
    if(textPrompt) {
        parts.push({ text: textPrompt });
    }

    inputs.files.forEach(file => {
        if(file.type.startsWith('image/')) {
            parts.push({ text: `Analyze the following UI mockup/screenshot named "${file.name}":` });
            parts.push({
                inlineData: {
                    mimeType: file.type,
                    data: file.dataUrl.split(',')[1],
                }
            });
        } else if (file.type.startsWith('video/') && file.frames && file.frames.length > 0) {
            parts.push({ text: `Analyze the following keyframes extracted from the video named "${file.name}":` });
            file.frames.forEach(frameDataUrl => {
                 parts.push({
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: frameDataUrl.split(',')[1],
                    }
                });
            });
        }
    });

    if (additionalContext) {
        parts.push({ text: additionalContext });
    }
    
    return parts;
}

export async function analyzeInputs(inputs: InputData): Promise<Analysis> {
  try {
    const parts = buildMultimodalPrompt(inputs);
    if (parts.length === 0) throw new Error("No content to analyze.");
      
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { role: "user", parts },
      config: {
        systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    });
    const result = JSON.parse(response.text);
    if (!result || !Array.isArray(result.findings)) throw new Error('Invalid analysis response format.');
    return result as Analysis;
  } catch (error) {
    console.error("Error analyzing inputs:", error);
    throw new Error(`Failed to get analysis from Gemini API. ${error instanceof Error ? error.message : ''}`);
  }
}

async function _generateSingleTestPlan(inputs: InputData, findings?: AnalysisFinding[]): Promise<TestPlan> {
    let additionalContext = "\n---\n";
    if (findings && findings.length > 0) {
        const findingsText = findings.map(f => `- ${f.category} (${f.source_story_id || 'N/A'}): ${f.description}`).join('\n');
        additionalContext += `\nPlease pay special attention to addressing the following gaps that were identified:\n${findingsText}`;
    }

    const parts = buildMultimodalPrompt(inputs, additionalContext);

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { role: "user", parts },
      config: {
        systemInstruction: TEST_PLAN_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: TEST_PLAN_RESPONSE_SCHEMA,
        temperature: 0.5,
      },
    });
    const result = JSON.parse(response.text);
    if (!result || typeof result.markdown !== 'string' || typeof result.gherkin !== 'string') throw new Error('Invalid test plan response format.');
    return result as TestPlan;
}

async function _prioritizeTestCases(testCases: Omit<TestCase, 'priority' | 'priority_reasoning'>[]): Promise<TestCase[]> {
    const prompt = `Prioritize the following test cases:\n\n${JSON.stringify(testCases.map(tc => ({id: tc.id, summary: tc.summary, risk: tc.risk})), null, 2)}`;
    
    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: { role: "user", parts: [{ text: prompt }] },
        config: {
            systemInstruction: PRIORITIZATION_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: PRIORITIZATION_RESPONSE_SCHEMA,
            temperature: 0.1
        }
    });
    const result = JSON.parse(response.text) as PrioritizationResponse;
    if (!result || !Array.isArray(result.prioritized_cases)) throw new Error('Invalid prioritization response format.');

    const priorityMap = new Map(result.prioritized_cases.map((p: PrioritizedCase) => [p.test_case_id, { priority: p.priority, reasoning: p.reasoning }]));
    
    return testCases.map(tc => {
        const priorityInfo = priorityMap.get(tc.id) || { priority: 'P2', reasoning: 'N/A - Defaulted' };
        return { ...tc, priority: priorityInfo.priority, priority_reasoning: priorityInfo.reasoning };
    });
}

async function _generateTraceabilityMatrix(testCases: TestCase[]): Promise<TraceabilityMatrix> {
    const relevantData = testCases.map(tc => ({ test_case_id: tc.id, story_id: tc.storyId }));
    const prompt = `Generate a traceability matrix from the following test case data:\n\n${JSON.stringify(relevantData, null, 2)}`;

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: { role: "user", parts: [{ text: prompt }] },
        config: {
            systemInstruction: TRACEABILITY_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: TRACEABILITY_RESPONSE_SCHEMA,
            temperature: 0.1
        }
    });

    const result = JSON.parse(response.text) as TraceabilityMatrix;
    if (!result || !Array.isArray(result.matrix)) throw new Error('Invalid traceability matrix response format.');
    return result;
}

export async function generateFullTestPlan(
  inputs: InputData,
  findings: AnalysisFinding[] | undefined,
  onProgress: (message: string, step: Step) => void
): Promise<{testCases: TestCase[], gherkin: string, traceabilityMatrix: TraceabilityMatrix}> {
  try {
    // Step 1: Generate plan (single call)
    onProgress('Generating comprehensive test plan...', Step.GENERATING_PLAN);
    const plan = await _generateSingleTestPlan(inputs, findings);
    
    // Step 2: Parse the result
    const parsedTestCases = parseMarkdownTable(plan.markdown);
    if (parsedTestCases.length === 0) {
        throw new Error("Failed to parse any test cases from the generated markdown.");
    }

    // Step 3: Prioritize the test cases
    onProgress('Prioritizing test cases...', Step.PRIORITIZING_PLAN);
    const prioritizedTestCases = await _prioritizeTestCases(parsedTestCases);
    
    // Step 4: Generate Traceability Matrix
    onProgress('Creating traceability matrix...', Step.GENERATING_TRACEABILITY);
    
    const traceabilityMatrix = await _generateTraceabilityMatrix(prioritizedTestCases);
    
    return { testCases: prioritizedTestCases, gherkin: plan.gherkin, traceabilityMatrix };

  } catch (error) {
    console.error("Error in the full test plan process:", error);
    let detail = "An unknown error occurred.";
    if (error instanceof Error) {
        detail = error.message;
    } else if (typeof error === 'object' && error !== null) {
        const errObj = error as any;
        detail = errObj.message || JSON.stringify(errObj);
    }
    throw new Error(`Failed to generate and prioritize test plan. ${detail}`);
  }
}

export async function generateQaDocumentation(inputs: InputData): Promise<string> {
    try {
        const parts = buildMultimodalPrompt(inputs, QA_DOCS_GENERATION_INSTRUCTION);

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: { role: "user", parts },
            config: {
              temperature: 0.6,
            },
        });

        return response.text;

    } catch (error) {
        console.error("Error generating QA documentation:", error);
        throw new Error(`Failed to generate QA documentation from Gemini API. ${error instanceof Error ? error.message : ''}`);
    }
}
