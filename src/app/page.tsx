'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Image from 'next/image';

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
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateStats = (ingredients: Ingredient[]): SummaryStats => {
    return ingredients.reduce((acc, ingredient) => ({
      total: acc.total + 1,
      highRisk: acc.highRisk + (ingredient.classification === 'high_risk' ? 1 : 0),
      moderateRisk: acc.moderateRisk + (ingredient.classification === 'moderate_risk' ? 1 : 0),
      healthy: acc.healthy + (ingredient.classification === 'healthy' ? 1 : 0)
    }), { total: 0, highRisk: 0, moderateRisk: 0, healthy: 0 });
  };

  const handleSampleClick = async (sampleNumber: number) => {
    try {
      const response = await fetch(`/sample_pictures/sample_${sampleNumber}.png`);
      const blob = await response.blob();
      const file = new File([blob], `sample_${sampleNumber}.png`, { type: 'image/png' });
      setFile(file);
      handleUpload(file);
    } catch (err) {
      console.error('Error loading sample:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (fileToUpload: File | null = null) => {
    let pollInterval: NodeJS.Timeout;

    try {
      setLoading(true);
      setError(null);
      setAnalysis(null);
      
      const uploadFile = fileToUpload || file;
      if (!uploadFile) {
        setError('Please select an image first');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('image', uploadFile);

      // Start the analysis
      const startResponse = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        throw new Error(errorData.error || 'Failed to start analysis');
      }

      const { jobId } = await startResponse.json();
      
      // Poll for results
      pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/analyze/status?jobId=${jobId}`);
          
          if (statusResponse.status === 404) {
            clearInterval(pollInterval);
            setError('Analysis job not found - please try again');
            setLoading(false);
            return;
          }

          if (!statusResponse.ok) {
            const errorData = await statusResponse.json();
            throw new Error(errorData.error || 'Failed to check analysis status');
          }

          const job = await statusResponse.json();
          
          if (job.status === 'completed') {
            clearInterval(pollInterval);
            setAnalysis(job.result);
            setLoading(false);
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            setError(job.error || 'Analysis failed');
            setLoading(false);
          }
          // Continue polling if status is 'pending' or 'processing'
        } catch (pollError) {
          clearInterval(pollInterval);
          setError(pollError instanceof Error ? pollError.message : 'Failed to check analysis status');
          setLoading(false);
        }
      }, 2000); // Poll every 2 seconds

    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze image');
      setLoading(false);
    }

    // Clean up interval when component unmounts
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
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

  useEffect(() => {
    // Clean up the old preview URL when component unmounts or file changes
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, [file]);

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
        
        {/* Sample Images Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-slate-100">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Sample Labels</h2>
          <p className="text-slate-600 mb-6">Click on any sample to analyze it:</p>
          <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
            <button 
              onClick={() => handleSampleClick(1)}
              className="text-left transition-transform hover:scale-105"
            >
              <Image 
                src="/sample_pictures/sample_1.png"
                alt="Sample Label 1"
                width={300}
                height={300}
                priority
                className="w-full h-48 object-contain rounded-lg border border-slate-200"
              />
              <p className="text-sm text-slate-500 text-center mt-2">Sample Label 1</p>
            </button>
            <button 
              onClick={() => handleSampleClick(2)}
              className="text-left transition-transform hover:scale-105"
            >
              <Image 
                src="/sample_pictures/sample_2.png"
                alt="Sample Label 2"
                width={300}
                height={300}
                priority
                className="w-full h-48 object-contain rounded-lg border border-slate-200"
              />
              <p className="text-sm text-slate-500 text-center mt-2">Sample Label 2</p>
            </button>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-slate-100">
          <div 
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-slate-300 transition-colors cursor-pointer relative"
            onClick={() => fileInputRef.current?.click()}
          >
            {file && previewUrl ? (
              <div className="mb-4">
                <Image 
                  src={previewUrl}
                  alt="Selected image preview"
                  width={300}
                  height={300}
                  className="max-h-48 mx-auto rounded-lg border border-slate-200 object-contain"
                  unoptimized // Since we're using object URLs
                />
                <p className="text-sm text-slate-600 mt-2">Selected: {file.name}</p>
              </div>
            ) : (
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <div className="flex text-sm text-slate-600 flex-col items-center">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500"
              >
                <span>{file ? 'Change image' : 'Upload a nutrition label'}</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  ref={fileInputRef}
                  className="sr-only"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
              {!file && <p className="pl-1">or drag and drop</p>}
            </div>
            <p className="text-xs text-slate-500 mt-2">PNG, JPG, GIF up to 10MB</p>
          </div>
          
          {file && (
            <div className="mt-4">
              <Button
                onClick={() => handleUpload()}
                disabled={loading}
                className={`w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-full transition duration-150 ${loading ? 'opacity-75' : ''}`}
              >
                {loading ? 'Analyzing Ingredients...' : 'Analyze Ingredients'}
              </Button>
            </div>
          )}
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
