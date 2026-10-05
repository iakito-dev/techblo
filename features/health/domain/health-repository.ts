export type FeedHealthSnapshot = {
  enabledCompanies: number;
  staleCompanies: number;
  failingCompanies: number;
  newestFetchedAt: Date | string | null;
};

export type HealthRepository = {
  checkDb(): Promise<void>;
  getFeedSnapshot(input: {
    staleAfterHours: number;
    failingAfterCount: number;
  }): Promise<FeedHealthSnapshot>;
};
