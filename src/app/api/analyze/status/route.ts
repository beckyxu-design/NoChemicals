import { NextResponse } from 'next/server';
import { analysisStore } from '@/lib/store';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      console.error('No jobId provided in request');
      return NextResponse.json(
        { error: 'No jobId provided' },
        { status: 400 }
      );
    }

    console.log('Checking status for job:', jobId);
    const job = analysisStore.getJob(jobId);
    
    if (!job) {
      console.log('Job not found:', jobId);
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    console.log('Job status:', jobId, job.status);
    return NextResponse.json(job);
  } catch (error) {
    console.error('Error checking status:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
