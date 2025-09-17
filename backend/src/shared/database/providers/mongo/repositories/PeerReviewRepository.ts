import { IPeerReview, ReviewStatus } from '#root/shared/interfaces/models.js';
import { GLOBAL_TYPES } from '#root/types.js';
import { inject } from 'inversify';
import { ClientSession, Collection, ObjectId } from 'mongodb';
import { MongoDatabase } from '../MongoDatabase.js';
import { isValidObjectId } from '#root/utils/isValidObjectId.js';
import { BadRequestError, InternalServerError } from 'routing-controllers';
import { IPeerReviewRepository } from '#root/shared/database/interfaces/IPeerReviewRepository.js';

export class PeerReviewRepository implements IPeerReviewRepository {
  private peerReviewsCollection: Collection<IPeerReview>;

  constructor(
    @inject(GLOBAL_TYPES.Database)
    private db: MongoDatabase,
  ) {}

  private async init() {
    this.peerReviewsCollection = await this.db.getCollection<IPeerReview>('peerReviews');
  }

  async createReview(
    review: Omit<IPeerReview, '_id' | 'createdAt' | 'updatedAt'>,
    session?: ClientSession,
  ): Promise<IPeerReview> {
    try {
      await this.init();

      const answerIdStr = review.answerId.toString();
      const reviewerIdStr = review.reviewerId.toString();

      if (!answerIdStr || !isValidObjectId(answerIdStr)) {
        throw new BadRequestError('Invalid or missing answerId');
      }
      if (!reviewerIdStr || !isValidObjectId(reviewerIdStr)) {
        throw new BadRequestError('Invalid or missing reviewerId');
      }

      const doc: Omit<IPeerReview, '_id'> = {
        ...review,
        answerId: new ObjectId(answerIdStr),
        reviewerId: new ObjectId(reviewerIdStr),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.peerReviewsCollection.insertOne(doc, { session });
      if (!result.acknowledged) {
        throw new InternalServerError('Failed to create peer review');
      }

      return {
        ...doc,
        _id: result.insertedId,
      } as IPeerReview;
    } catch (error) {
      console.error('Error creating peer review:', error);
      throw error;
    }
  }

  async getReviewById(reviewId: string, session?: ClientSession): Promise<IPeerReview | null> {
    try {
      await this.init();

      if (!reviewId || !isValidObjectId(reviewId)) {
        throw new BadRequestError('Invalid reviewId');
      }

      return await this.peerReviewsCollection.findOne(
        { _id: new ObjectId(reviewId) },
        { session }
      );
    } catch (error) {
      console.error('Error getting review by ID:', error);
      throw error;
    }
  }

  async getReviewsForAnswer(answerId: string, session?: ClientSession): Promise<IPeerReview[]> {
    try {
      await this.init();

      if (!answerId || !isValidObjectId(answerId)) {
        throw new BadRequestError('Invalid answerId');
      }

      const reviews = await this.peerReviewsCollection
        .find({ answerId: new ObjectId(answerId) }, { session })
        .sort({ createdAt: 1 })
        .toArray();

      return reviews;
    } catch (error) {
      console.error('Error getting reviews for answer:', error);
      throw error;
    }
  }

  async getReviewsForReviewer(reviewerId: string, session?: ClientSession): Promise<IPeerReview[]> {
    try {
      await this.init();

      if (!reviewerId || !isValidObjectId(reviewerId)) {
        throw new BadRequestError('Invalid reviewerId');
      }

      const reviews = await this.peerReviewsCollection
        .find({ reviewerId: new ObjectId(reviewerId) }, { session })
        .sort({ createdAt: -1 })
        .toArray();

      return reviews;
    } catch (error) {
      console.error('Error getting reviews for reviewer:', error);
      throw error;
    }
  }

  async getPendingReviewsForReviewer(reviewerId: string, session?: ClientSession): Promise<IPeerReview[]> {
    try {
      await this.init();

      if (!reviewerId || !isValidObjectId(reviewerId)) {
        throw new BadRequestError('Invalid reviewerId');
      }

      const reviews = await this.peerReviewsCollection
        .find({
          reviewerId: new ObjectId(reviewerId),
          status: 'assigned'
        }, { session })
        .sort({ assignedAt: 1 })
        .toArray();

      return reviews;
    } catch (error) {
      console.error('Error getting pending reviews for reviewer:', error);
      throw error;
    }
  }

  async updateReview(
    reviewId: string,
    updates: Partial<IPeerReview>,
    session?: ClientSession,
  ): Promise<{ modifiedCount: number }> {
    try {
      await this.init();

      if (!reviewId || !isValidObjectId(reviewId)) {
        throw new BadRequestError('Invalid reviewId');
      }

      const updateDoc = {
        ...updates,
        updatedAt: new Date(),
      };

      // Convert ObjectId fields if they are being updated
      if (updates.answerId && typeof updates.answerId === 'string') {
        updateDoc.answerId = new ObjectId(updates.answerId);
      }
      if (updates.reviewerId && typeof updates.reviewerId === 'string') {
        updateDoc.reviewerId = new ObjectId(updates.reviewerId);
      }

      const result = await this.peerReviewsCollection.updateOne(
        { _id: new ObjectId(reviewId) },
        { $set: updateDoc },
        { session }
      );

      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  }

  async updateReviewStatus(
    reviewId: string,
    status: ReviewStatus,
    session?: ClientSession,
  ): Promise<{ modifiedCount: number }> {
    return this.updateReview(reviewId, { status, updatedAt: new Date() }, session);
  }

  async submitReview(
    reviewId: string,
    score: number,
    comments?: string,
    similarity?: number,
    session?: ClientSession,
  ): Promise<{ modifiedCount: number }> {
    try {
      await this.init();

      if (!reviewId || !isValidObjectId(reviewId)) {
        throw new BadRequestError('Invalid reviewId');
      }

      if (score < 1 || score > 5) {
        throw new BadRequestError('Score must be between 1 and 5');
      }

      const updateDoc: Partial<IPeerReview> = {
        score,
        status: 'submitted',
        submittedAt: new Date(),
        updatedAt: new Date(),
      };

      if (comments !== undefined) {
        updateDoc.comments = comments;
      }

      if (similarity !== undefined) {
        updateDoc.similarity = similarity;
      }

      const result = await this.peerReviewsCollection.updateOne(
        { _id: new ObjectId(reviewId) },
        { $set: updateDoc },
        { session }
      );

      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  }

  async deleteReview(reviewId: string, session?: ClientSession): Promise<{ deletedCount: number }> {
    try {
      await this.init();

      if (!reviewId || !isValidObjectId(reviewId)) {
        throw new BadRequestError('Invalid reviewId');
      }

      const result = await this.peerReviewsCollection.deleteOne(
        { _id: new ObjectId(reviewId) },
        { session }
      );

      return { deletedCount: result.deletedCount };
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  }

  async getReviewStatsForAnswer(
    answerId: string,
    session?: ClientSession,
  ): Promise<{
    totalReviews: number;
    completedReviews: number;
    averageScore: number;
    thresholdReached: boolean;
  }> {
    try {
      await this.init();

      if (!answerId || !isValidObjectId(answerId)) {
        throw new BadRequestError('Invalid answerId');
      }

      const reviews = await this.getReviewsForAnswer(answerId, session);
      const completedReviews = reviews.filter(review => review.status === 'submitted' && review.score !== undefined);

      const totalReviews = reviews.length;
      const completedCount = completedReviews.length;

      let averageScore = 0;
      if (completedCount > 0) {
        const totalScore = completedReviews.reduce((sum, review) => sum + (review.score || 0), 0);
        averageScore = totalScore / completedCount;
      }

      // Threshold: 70% of max score (5) = 3.5, with at least 3 completed reviews
      const thresholdReached = averageScore >= 3.5 && completedCount >= 3;

      return {
        totalReviews,
        completedReviews: completedCount,
        averageScore,
        thresholdReached,
      };
    } catch (error) {
      console.error('Error getting review stats for answer:', error);
      throw error;
    }
  }
}
