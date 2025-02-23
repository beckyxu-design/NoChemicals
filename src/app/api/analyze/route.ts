import { NextResponse } from "next/server";
import OpenAI from "openai";
import { nutrientClassification } from "@/lib/utils";
import { config, validateEnv } from "@/lib/config";

try {
  validateEnv();
} catch (error) {
  console.error('Environment validation error:', error);
}

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  dangerouslyAllowBrowser: true,
  timeout: 30000,
});

function extractJsonFromText(text: string): any {
  try {
    // Remove markdown code block markers if present
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    
    // Try to parse the entire text first
    try {
      return JSON.parse(cleanText);
    } catch (e) {
      console.log('Failed to parse entire text, trying to extract JSON object');
    }

    // If that fails, try to find JSON object in the text using regex
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    console.error('No valid JSON found in text');
    return null;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    console.log('Starting image analysis...');
    validateEnv();
    
    const formData = await req.formData();
    const image = formData.get("image") as File;
    console.log('Image received:', {
      name: image?.name,
      size: image?.size,
      type: image?.type
    });

    if (!image) {
      console.error('No image provided in request');
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    console.log('Converting image to base64...');
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    console.log('Image converted to base64, length:', base64Image.length);

    // First API call: Extract text from image
    console.log('Making first API call to extract text...');
    const textExtractionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Read this nutrition label image and extract all the text content. Include all ingredients, nutrients, and their amounts. Output the text in a clear, readable format.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 5000,
    });

    console.log('Text extraction response received');
    const extractedText = textExtractionResponse.choices[0].message.content;
    console.log('Extracted text:', extractedText);

    // Second API call: Analyze the extracted text for cancer risks
    console.log('Making second API call to analyze text...');
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `Analyze these ingredients and classify each as high_risk, moderate_risk, or healthy. For each ingredient, provide a ONE sentence explanation about its health impact. Return ONLY a JSON object with this structure: {"ingredients": [{"name": string, "classification": string, "explanation": string}]}.

Here's the ingredients list from the nutrition label:
${extractedText}`
        }
      ],
      max_tokens: 5000,
    });

    console.log('Analysis response received');
    const analysisText = analysisResponse.choices[0].message.content;
    console.log('Analysis result:', analysisText);

    // Parse the JSON from the response
    const analysis = extractJsonFromText(analysisText);
    if (!analysis) {
      throw new Error('Failed to parse analysis results');
    }

    return NextResponse.json({ 
      analysis,
      extractedText,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      // Log the error response if it's an API error
      if ('response' in error) {
        console.error('API Error Response:', {
          // @ts-ignore
          status: error.response?.status,
          // @ts-ignore
          statusText: error.response?.statusText,
          // @ts-ignore
          data: error.response?.data
        });
      }
    }
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to analyze image",
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
