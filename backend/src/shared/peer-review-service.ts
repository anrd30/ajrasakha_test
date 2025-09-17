import { IPeerReview, ReviewStatus } from '#root/shared/interfaces/models.js';

// In-memory storage for peer reviews (replace with database later)
const peerReviews: IPeerReview[] = [];

export class PeerReviewService {
  // Create a new review record
  static createReview(review: Omit<IPeerReview, '_id' | 'createdAt' | 'updatedAt'>): IPeerReview {
    const newReview: IPeerReview = {
      ...review,
      _id: `review_${Date.now()}_${Math.random()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    peerReviews.push(newReview);
    return newReview;
  }

  // Add/update a peer review (for backward compatibility)
  static addReview(review: Omit<IPeerReview, '_id' | 'createdAt' | 'updatedAt'>): IPeerReview {
    return this.createReview(review);
  }

  // Submit a completed review
  static submitReview(reviewId: string, score: number, comments?: string, similarity?: number): boolean {
    const review = peerReviews.find(r => r._id === reviewId);
    if (!review) return false;

    review.score = score;
    review.comments = comments;
    review.similarity = similarity;
    review.status = 'submitted';
    review.submittedAt = new Date();
    review.updatedAt = new Date();

    return true;
  }

  // Update review status
  static updateReviewStatus(reviewId: string, status: ReviewStatus): boolean {
    const review = peerReviews.find(r => r._id === reviewId);
    if (!review) return false;

    review.status = status;
    review.updatedAt = new Date();

    return true;
  }

  // Get all reviews for an answer
  static getReviewsForAnswer(answerId: string): IPeerReview[] {
    return peerReviews.filter(review => review.answerId === answerId);
  }

  // Get completed reviews for an answer (for similarity calculation)
  static getCompletedReviewsForAnswer(answerId: string): IPeerReview[] {
    return peerReviews.filter(
      review => review.answerId === answerId &&
                review.status === 'submitted' &&
                review.score !== undefined
    );
  }

  // Calculate if similarity threshold is reached (using only completed reviews)
  static calculateSimilarity(answerId: string): { average: number; thresholdReached: boolean; reviewCount: number } {
    const completedReviews = this.getCompletedReviewsForAnswer(answerId);

    if (completedReviews.length < 2) {
      return { average: 0, thresholdReached: false, reviewCount: completedReviews.length };
    }

    const scores = completedReviews.map(r => r.score!);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Threshold: 70% of max score (5) = 3.5, with at least 3 completed reviews
    const thresholdReached = average >= 3.5 && completedReviews.length >= 3;

    return { average, thresholdReached, reviewCount: completedReviews.length };
  }

  // Get review count for an answer
  static getReviewCount(answerId: string): number {
    return this.getReviewsForAnswer(answerId).length;
  }

  // Get pending reviews for a reviewer
  static getPendingReviewsForReviewer(reviewerId: string): IPeerReview[] {
    return peerReviews.filter(
      review => review.reviewerId === reviewerId &&
                review.status === 'assigned'
    );
  }

  // Get review by ID
  static getReviewById(reviewId: string): IPeerReview | undefined {
    return peerReviews.find(review => review._id === reviewId);
  }

  // Get all reviews (for admin purposes)
  static getAllReviews(): IPeerReview[] {
    return [...peerReviews];
  }
}
