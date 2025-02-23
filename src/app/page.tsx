'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Ingredient {
  name: string;
  classification: 'high_risk' | 'moderate_risk' | 'healthy';
  explanation: string;
}

interface AnalysisResponse {
  ingredients: Ingredient[];
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze image');
      }

      setAnalysis(data.analysis);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(`Error: ${errorMessage}. Please check your API key and try again.`);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const getColorForClassification = (classification: string) => {
    switch (classification) {
      case 'high_risk':
        return 'bg-red-50 border-red-200';
      case 'moderate_risk':
        return 'bg-yellow-50 border-yellow-200';
      case 'healthy':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColorForClassification = (classification: string) => {
    switch (classification) {
      case 'high_risk':
        return 'text-red-700';
      case 'moderate_risk':
        return 'text-yellow-700';
      case 'healthy':
        return 'text-green-700';
      default:
        return 'text-gray-700';
    }
  };

  const getBadgeColorForClassification = (classification: string) => {
    switch (classification) {
      case 'high_risk':
        return 'bg-red-100 text-red-800';
      case 'moderate_risk':
        return 'bg-yellow-100 text-yellow-800';
      case 'healthy':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-green-800 mb-4">Ingredient Health Analyzer</h1>
          <p className="text-gray-600">Upload a nutrition label to identify potentially harmful ingredients</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="mb-6">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-3 file:px-6
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-green-50 file:text-green-700
                hover:file:bg-green-100
                transition duration-150"
            />
          </div>
          
          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            className={`w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-full transition duration-150 ${loading ? 'opacity-75' : ''}`}
          >
            {loading ? 'Analyzing Ingredients...' : 'Analyze Ingredients'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-8">
            {error}
          </div>
        )}

        {analysis?.ingredients && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {analysis.ingredients.map((item, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-lg border ${getColorForClassification(item.classification)} transition-all duration-150 hover:shadow-md`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{item.name}</h3>
                      <p className="text-gray-600 text-sm">{item.explanation}</p>
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getBadgeColorForClassification(item.classification)}`}>
                      {item.classification.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                🔍 Health Impact Guide:
                <span className="font-semibold text-red-700"> Red</span> - High risk, avoid if possible |
                <span className="font-semibold text-yellow-700"> Yellow</span> - Moderate risk, consume in moderation |
                <span className="font-semibold text-green-700"> Green</span> - Generally safe
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
