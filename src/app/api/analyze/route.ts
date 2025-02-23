import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { analysisStore } from '@/lib/store';
import crypto from 'crypto';

interface Ingredient {
  name: string;
  classification: 'high_risk' | 'moderate_risk' | 'healthy';
  explanation: string;
}

interface AnalysisResult {
  ingredients: Array<{
    name: string;
    classification: string;
    explanation: string;
    papers: Array<{
      title: string;
      url: string;
    }>;
  }>;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanJsonResponse(text: string): string {
  // Remove markdown code block markers if present
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  return cleaned;
}

async function searchPubMedPapers(ingredient: string): Promise<{ title: string; url: string }[]> {
  const searchTerm = encodeURIComponent(ingredient);
  const baseUrl = 'https://pubmed.ncbi.nlm.nih.gov/?term=';
  
  return [{
    title: `Research about ${ingredient}`,
    url: `${baseUrl}${searchTerm}`
  }];
}

async function analyzeImage(base64Image: string): Promise<AnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              // alternative for text below: 
              // text: 'Given the following ingredient list, identify any potentially harmful or toxic ingredients. For each ingredient, list alternative names (synonyms, E numbers, or IUPAC chemical names) used in labeling and research literature. Explain potential health risks associated with these ingredients.For each ingredient, classify it as 'high_risk', 'moderate_risk', or 'healthy' based on its potential health impacts. Return the response in this exact JSON format without any markdown formatting:          
              text: `Analyze this nutrition label image and identify all ingredients. For each ingredient, classify it as 'high_risk', 'moderate_risk', or 'healthy' based on its potential health impacts. Also provide a brief one-sentence explanation of its health effects. Return the response in this exact JSON format without any markdown formatting:
              {
                "ingredients": [
                  {
                    "name": "ingredient name",
                    "classification": "classification",
                    "explanation": "brief explanation"
                  }
                ]
              }`
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }

    const cleanedContent = cleanJsonResponse(content);
    
    try {
      const parsedResponse = JSON.parse(cleanedContent) as { ingredients: Ingredient[] };
      
      // Add PubMed papers for each ingredient
      const ingredientsWithPapers = await Promise.all(
        parsedResponse.ingredients.map(async (ingredient) => {
          const papers = await searchPubMedPapers(ingredient.name);
          return {
            ...ingredient,
            papers
          };
        })
      );

      return {
        ingredients: ingredientsWithPapers
      };
    } catch {
      console.error('Failed to parse response:', cleanedContent);
      throw new Error('Failed to parse analysis results');
    }
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
}

// Start analysis endpoint
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Generate a unique ID for this analysis job
    const jobId = crypto.randomUUID();
    console.log('Creating new job:', jobId);
    analysisStore.createJob(jobId);

    // Start the analysis in the background
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = `data:${image.type};base64,${buffer.toString('base64')}`;

    // Update job status to processing
    console.log('Starting analysis for job:', jobId);
    analysisStore.updateJob(jobId, { status: 'processing' });

    // Don't await the analysis, let it run in the background
    (async () => {
      try {
        console.log('Running analysis for job:', jobId);
        const result = await analyzeImage(base64Image);
        console.log('Analysis completed for job:', jobId);
        analysisStore.updateJob(jobId, { 
          status: 'completed',
          result,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Analysis failed for job:', jobId, error);
        analysisStore.updateJob(jobId, { 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        });
      }
    })();

    // Immediately return the job ID
    return NextResponse.json({ jobId });

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to start analysis' },
      { status: 500 }
    );
  }
}
