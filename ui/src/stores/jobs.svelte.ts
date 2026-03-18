import type { Job } from '../lib/types';
import { getJobs, clearJobs as apiClearJobs } from '../lib/api';

class JobsStore {
  jobs = $state<Job[]>([]);
  selectedJobId = $state<string | null>(null);

  async refresh() {
    const { jobs } = await getJobs();
    this.jobs = jobs;
  }

  async clear() {
    await apiClearJobs();
    this.selectedJobId = null;
    await this.refresh();
  }

  select(id: string) {
    this.selectedJobId = id;
  }
}

export const jobsStore = new JobsStore();
