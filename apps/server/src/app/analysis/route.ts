import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@oliver/core';
// Assuming we have an LLM service, using a placeholder/mock for now as none was found in services
// In production, import { GeminiService } from '@/services/ai/gemini.service';

export async function POST(req: NextRequest) {
    try {
        const { issueKey, summary, description } = await req.json();

        // 1. Validate input
        if (!issueKey) {
            return NextResponse.json({ error: 'Missing issueKey' }, { status: 400 });
        }

        // 2. Perform AI Analysis (Mock Implementation until LLM Service is integrated)
        // const analysis = await GeminiService.analyzeIssue(summary, description);

        const mockAnalysis = {
            complexity: description?.length > 500 ? 'High' : 'Low',
            estimatedTime: '2-4 hours',
            suggestedFiles: [
                'src/components/Dashboard.tsx',
                'src/services/api.ts'
            ],
            summary: `This issue appears to be related to ${summary}. Creating a fix handling logic for edge cases is recommended.`
        };

        return NextResponse.json(mockAnalysis);
    } catch (error: any) {
        Logger.error('AI Analysis Failed', error);
        return NextResponse.json(
            { error: 'Failed to analyze issue' },
            { status: 500 }
        );
    }
}
