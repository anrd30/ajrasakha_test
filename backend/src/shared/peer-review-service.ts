import { IPeerReview } from '../shared/interfaces/models.js';

// Simple in-memory storage for peer reviews (replace with database later)
const peerReviews: IPeerReview[] = [];

export class PeerReviewService {
  // Add a peer review
  static addReview(review: Omit<IPeerReview, '_id' | 'createdAt'>): void {
    const newReview: IPeerReview = {
      ...review,
      _id: `review_${Date.now()}_${Math.random()}`,
      createdAt: new Date(),
    };
    peerReviews.push(newReview);
  }

  // Get all reviews for an answer
  static getReviewsForAnswer(answerId: string): IPeerReview[] {
    return peerReviews.filter(review => review.answerId === answerId);
  }

  // Calculate if similarity threshold is reached (simple average)
  static calculateSimilarity(answerId: string): { average: number; thresholdReached: boolean } {
    const reviews = this.getReviewsForAnswer(answerId);
    if (reviews.length < 2) {
      return { average: 0, thresholdReached: false };
    }

    const scores = reviews.map(r => r.score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Simple threshold: 70% of max score (5) = 3.5
    const thresholdReached = average >= 3.5 && reviews.length >= 3;

    return { average, thresholdReached };
  }

  // Get review count for an answer
  static getReviewCount(answerId: string): number {
    return this.getReviewsForAnswer(answerId).length;
  }
}
