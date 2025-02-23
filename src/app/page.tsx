'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface Paper {
  title: string;
  url: string;
}

interface Ingredient {
  name: string;
  classification: 'high_risk' | 'moderate_risk' | 'healthy';
  explanation: string;
  papers: Paper[];
}

interface AnalysisResponse {
  ingredients: Ingredient[];
}

interface SummaryStats {
  total: number;
  highRisk: number;
  moderateRisk: number;
  healthy: number;
}

const LoadingSkeleton = () => (
  <div className="space-y-8">
    {/* Stats Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
          <div className="h-8 mb-2">
            <Skeleton height={32} />
          </div>
          <Skeleton height={20} />
        </div>
      ))}
    </div>

    {/* Ingredients List Skeleton */}
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
      <div className="h-8 mb-6">
        <Skeleton height={32} width={200} />
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-6 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton height={24} width={200} />
              <Skeleton height={24} width={100} />
            </div>
            <Skeleton count={2} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateStats = (ingredients: Ingredient[]): SummaryStats => {
    return ingredients.reduce((acc, ingredient) => ({
      total: acc.total + 1,
      highRisk: acc.highRisk + (ingredient.classification === 'high_risk' ? 1 : 0),
      moderateRisk: acc.moderateRisk + (ingredient.classification === 'moderate_risk' ? 1 : 0),
      healthy: acc.healthy + (ingredient.classification === 'healthy' ? 1 : 0)
    }), { total: 0, highRisk: 0, moderateRisk: 0, healthy: 0 });
  };

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

  const getRiskLevel = (classification: string): number => {
    switch (classification) {
      case 'high_risk':
        return 3;
      case 'moderate_risk':
        return 2;
      case 'healthy':
        return 1;
      default:
        return 0;
    }
  };

  const sortByRisk = (ingredients: Ingredient[]) => {
    return [...ingredients].sort((a, b) => getRiskLevel(b.classification) - getRiskLevel(a.classification));
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Ingredient Health Analyzer
          </h1>
          <p className="text-slate-600 text-lg">
            Upload a nutrition label to identify potentially harmful ingredients
          </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-slate-100">
          <div className="mb-6">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-3 file:px-6
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-slate-100 file:text-slate-700
                hover:file:bg-slate-200
                transition duration-150"
            />
          </div>
          
          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            className={`w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-full transition duration-150 ${loading ? 'opacity-75' : ''}`}
          >
            {loading ? 'Analyzing Ingredients...' : 'Analyze Ingredients'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-8">
            {error}
          </div>
        )}

        {loading && <LoadingSkeleton />}

        {!loading && analysis?.ingredients && (
          <div className="space-y-8">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {(() => {
                const stats = calculateStats(analysis.ingredients);
                return (
                  <>
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
                      <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                      <div className="text-slate-600">Total Ingredients</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-red-100">
                      <div className="text-2xl font-bold text-red-600">{stats.highRisk}</div>
                      <div className="text-slate-600">High Risk</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-yellow-100">
                      <div className="text-2xl font-bold text-yellow-600">{stats.moderateRisk}</div>
                      <div className="text-slate-600">Moderate Risk</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-green-100">
                      <div className="text-2xl font-bold text-green-600">{stats.healthy}</div>
                      <div className="text-slate-600">Healthy</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Ingredients List */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">Detailed Analysis</h2>
              <div className="grid grid-cols-1 gap-4">
                {sortByRisk(analysis.ingredients).map((item, index) => (
                  <div
                    key={index}
                    className={`p-6 rounded-xl border ${getColorForClassification(item.classification)} transition-all duration-150 hover:shadow-md`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getBadgeColorForClassification(item.classification)}`}>
                            {item.classification.replace('_', ' ')}
                          </div>
                        </div>
                        <p className="text-slate-600 text-sm mb-3">{item.explanation}</p>
                        {item.papers?.length > 0 && (
                          <div className="mt-2">
                            {item.papers.map((paper, idx) => (
                              <a
                                key={idx}
                                href={paper.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                {paper.title}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
              <p className="text-sm text-slate-600">
                <span className="font-semibold">🔍 Health Impact Guide:</span>
                <span className="font-medium text-red-700"> Red</span> - High risk, avoid if possible |
                <span className="font-medium text-yellow-700"> Yellow</span> - Moderate risk, consume in moderation |
                <span className="font-medium text-green-700"> Green</span> - Generally safe
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
