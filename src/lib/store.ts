import fs from 'fs';
import path from 'path';

// Simple file-based store for analysis jobs
interface AnalysisJob {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    ingredients: Array<{
      name: string;
      classification: string;
      explanation: string;
      papers: Array<{
        title: string;
        url: string;
      }>;
    }>;
  };
  error?: string;
  timestamp: number;
}

class JobStore {
  private storePath: string;
  
  constructor() {
    // Store jobs in the /tmp directory
    this.storePath = path.join('/tmp', 'analysis-jobs');
    // Ensure directory exists
    if (!fs.existsSync(this.storePath)) {
      fs.mkdirSync(this.storePath, { recursive: true });
    }
    
    // Cleanup old jobs periodically
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private getJobPath(id: string): string {
    return path.join(this.storePath, `${id}.json`);
  }
  
  createJob(id: string): string {
    console.log('Store: Creating job', id);
    const job: AnalysisJob = {
      status: 'pending',
      timestamp: Date.now()
    };
    fs.writeFileSync(this.getJobPath(id), JSON.stringify(job));
    return id;
  }
  
  updateJob(id: string, update: Partial<AnalysisJob>): void {
    console.log('Store: Updating job', id, update);
    const jobPath = this.getJobPath(id);
    
    try {
      const existingJob = this.getJob(id);
      if (existingJob) {
        const updatedJob: AnalysisJob = { 
          ...existingJob, 
          ...update,
          timestamp: Date.now() 
        };
        fs.writeFileSync(jobPath, JSON.stringify(updatedJob));
        console.log('Store: Job updated', id, updatedJob.status);
      } else {
        console.warn('Store: Attempted to update non-existent job', id);
      }
    } catch (error) {
      console.error('Store: Error updating job', id, error);
    }
  }
  
  getJob(id: string): AnalysisJob | undefined {
    console.log('Store: Getting job', id);
    const jobPath = this.getJobPath(id);
    
    try {
      if (!fs.existsSync(jobPath)) {
        console.log('Store: Job not found', id);
        return undefined;
      }
      
      const job = JSON.parse(fs.readFileSync(jobPath, 'utf8')) as AnalysisJob;
      
      // Clean up old jobs automatically
      if (Date.now() - job.timestamp > 60 * 60 * 1000) { // 1 hour
        console.log('Store: Removing expired job', id);
        fs.unlinkSync(jobPath);
        return undefined;
      }
      
      console.log('Store: Job found', id, job.status);
      return job;
    } catch (error) {
      console.error('Store: Error reading job', id, error);
      return undefined;
    }
  }
  
  cleanup(): void {
    console.log('Store: Running cleanup');
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let cleaned = 0;
    
    try {
      const files = fs.readdirSync(this.storePath);
      for (const file of files) {
        const jobPath = path.join(this.storePath, file);
        try {
          const job = JSON.parse(fs.readFileSync(jobPath, 'utf8')) as AnalysisJob;
          if (job.timestamp < oneHourAgo) {
            fs.unlinkSync(jobPath);
            cleaned++;
          }
        } catch {
          // If we can't read the file, delete it
          fs.unlinkSync(jobPath);
          cleaned++;
        }
      }
    } catch {
      console.error('Store: Error during cleanup');
    }
    
    if (cleaned > 0) {
      console.log('Store: Cleaned up', cleaned, 'old jobs');
    }
  }
}

// Create a single instance of the store
export const analysisStore = new JobStore();
