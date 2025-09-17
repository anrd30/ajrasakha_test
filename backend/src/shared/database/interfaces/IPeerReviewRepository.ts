import { ClientSession, ObjectId } from 'mongodb';
import { IPeerReview, ReviewStatus } from '#root/shared/interfaces/models.js';

/**
 * Interface representing a repository for peer review-related operations.
 */
export interface IPeerReviewRepository {
  /**
   * Creates a new peer review record.
   * @param review - The review data to create.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to the created review.
   */
  createReview(
    review: Omit<IPeerReview, '_id' | 'createdAt' | 'updatedAt'>,
    session?: ClientSession,
  ): Promise<IPeerReview>;

  /**
   * Retrieves a peer review by its ID.
   * @param reviewId - The ID of the review.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to the review or null.
   */
  getReviewById(reviewId: string, session?: ClientSession): Promise<IPeerReview | null>;

  /**
   * Retrieves all reviews for a specific answer.
   * @param answerId - The ID of the answer.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to an array of reviews.
   */
  getReviewsForAnswer(answerId: string, session?: ClientSession): Promise<IPeerReview[]>;

  /**
   * Retrieves all reviews for a specific reviewer.
   * @param reviewerId - The ID of the reviewer.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to an array of reviews.
   */
  getReviewsForReviewer(reviewerId: string, session?: ClientSession): Promise<IPeerReview[]>;

  /**
   * Retrieves pending reviews for a specific reviewer.
   * @param reviewerId - The ID of the reviewer.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to an array of pending reviews.
   */
  getPendingReviewsForReviewer(reviewerId: string, session?: ClientSession): Promise<IPeerReview[]>;

  /**
   * Updates a peer review.
   * @param reviewId - The ID of the review to update.
   * @param updates - Partial object containing the fields to update.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to the update result.
   */
  updateReview(
    reviewId: string,
    updates: Partial<IPeerReview>,
    session?: ClientSession,
  ): Promise<{ modifiedCount: number }>;

  /**
   * Updates the status of a peer review.
   * @param reviewId - The ID of the review.
   * @param status - The new status.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to the update result.
   */
  updateReviewStatus(
    reviewId: string,
    status: ReviewStatus,
    session?: ClientSession,
  ): Promise<{ modifiedCount: number }>;

  /**
   * Submits a completed review with score and comments.
   * @param reviewId - The ID of the review.
   * @param score - The score given (1-5).
   * @param comments - Optional comments.
   * @param similarity - Optional similarity score.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to the update result.
   */
  submitReview(
    reviewId: string,
    score: number,
    comments?: string,
    similarity?: number,
    session?: ClientSession,
  ): Promise<{ modifiedCount: number }>;

  /**
   * Deletes a peer review by its ID.
   * @param reviewId - The ID of the review to delete.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to the delete result.
   */
  deleteReview(reviewId: string, session?: ClientSession): Promise<{ deletedCount: number }>;

  /**
   * Gets review statistics for an answer.
   * @param answerId - The ID of the answer.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to review statistics.
   */
  getReviewStatsForAnswer(
    answerId: string,
    session?: ClientSession,
  ): Promise<{
    totalReviews: number;
    completedReviews: number;
    averageScore: number;
    thresholdReached: boolean;
  }>;
}
