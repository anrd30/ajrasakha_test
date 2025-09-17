import { IReviewerAssignment, AssignmentStatus } from '#root/shared/interfaces/models.js';
import { GLOBAL_TYPES } from '#root/types.js';
import { inject } from 'inversify';
import { ClientSession, Collection, ObjectId } from 'mongodb';
import { MongoDatabase } from '../MongoDatabase.js';
import { isValidObjectId } from '#root/utils/isValidObjectId.js';
import { BadRequestError, InternalServerError } from 'routing-controllers';
import { IReviewerAssignmentRepository } from '#root/shared/database/interfaces/IReviewerAssignmentRepository.js';

export class ReviewerAssignmentRepository implements IReviewerAssignmentRepository {
  private reviewerAssignmentsCollection: Collection<IReviewerAssignment>;

  constructor(
    @inject(GLOBAL_TYPES.Database)
    private db: MongoDatabase,
  ) {}

  private async init() {
    this.reviewerAssignmentsCollection = await this.db.getCollection<IReviewerAssignment>('reviewerAssignments');
  }

  async createAssignment(
    assignment: Omit<IReviewerAssignment, '_id' | 'createdAt' | 'updatedAt'>,
    session?: ClientSession,
  ): Promise<IReviewerAssignment> {
    try {
      await this.init();

      // Convert ObjectId fields to strings for validation
      const answerIdStr = assignment.answerId instanceof ObjectId
        ? assignment.answerId.toString()
        : assignment.answerId;
      const reviewerIdStr = assignment.reviewerId instanceof ObjectId
        ? assignment.reviewerId.toString()
        : assignment.reviewerId;

      if (!answerIdStr || !isValidObjectId(answerIdStr)) {
        throw new BadRequestError('Invalid or missing answerId');
      }
      if (!reviewerIdStr || !isValidObjectId(reviewerIdStr)) {
        throw new BadRequestError('Invalid or missing reviewerId');
      }

      const doc: Omit<IReviewerAssignment, '_id'> = {
        ...assignment,
        answerId: new ObjectId(answerIdStr),
        reviewerId: new ObjectId(reviewerIdStr),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.reviewerAssignmentsCollection.insertOne(doc, { session });
      if (!result.acknowledged) {
        throw new InternalServerError('Failed to create reviewer assignment');
      }

      return {
        ...doc,
        _id: result.insertedId,
      } as IReviewerAssignment;
    } catch (error) {
      console.error('Error creating reviewer assignment:', error);
      throw error;
    }
  }

  async getAssignmentById(assignmentId: string, session?: ClientSession): Promise<IReviewerAssignment | null> {
    try {
      await this.init();

      if (!assignmentId || !isValidObjectId(assignmentId)) {
        throw new BadRequestError('Invalid assignmentId');
      }

      return await this.reviewerAssignmentsCollection.findOne(
        { _id: new ObjectId(assignmentId) },
        { session }
      );
    } catch (error) {
      console.error('Error getting assignment by ID:', error);
      throw error;
    }
  }

  async getAssignmentsForAnswer(answerId: string, session?: ClientSession): Promise<IReviewerAssignment[]> {
    try {
      await this.init();

      if (!answerId || !isValidObjectId(answerId)) {
        throw new BadRequestError('Invalid answerId');
      }

      const assignments = await this.reviewerAssignmentsCollection
        .find({ answerId: new ObjectId(answerId) }, { session })
        .sort({ createdAt: 1 })
        .toArray();

      return assignments;
    } catch (error) {
      console.error('Error getting assignments for answer:', error);
      throw error;
    }
  }

  async getAssignmentsForReviewer(reviewerId: string, session?: ClientSession): Promise<IReviewerAssignment[]> {
    try {
      await this.init();

      if (!reviewerId || !isValidObjectId(reviewerId)) {
        throw new BadRequestError('Invalid reviewerId');
      }

      const assignments = await this.reviewerAssignmentsCollection
        .find({ reviewerId: new ObjectId(reviewerId) }, { session })
        .sort({ createdAt: -1 })
        .toArray();

      return assignments;
    } catch (error) {
      console.error('Error getting assignments for reviewer:', error);
      throw error;
    }
  }

  async getPendingAssignmentsForReviewer(reviewerId: string, session?: ClientSession): Promise<IReviewerAssignment[]> {
    try {
      await this.init();

      if (!reviewerId || !isValidObjectId(reviewerId)) {
        throw new BadRequestError('Invalid reviewerId');
      }

      const assignments = await this.reviewerAssignmentsCollection
        .find({
          reviewerId: new ObjectId(reviewerId),
          status: 'pending'
        }, { session })
        .sort({ assignedAt: 1 })
        .toArray();

      return assignments;
    } catch (error) {
      console.error('Error getting pending assignments for reviewer:', error);
      throw error;
    }
  }

  async updateAssignment(
    assignmentId: string,
    updates: Partial<IReviewerAssignment>,
    session?: ClientSession,
  ): Promise<{ modifiedCount: number }> {
    try {
      await this.init();

      if (!assignmentId || !isValidObjectId(assignmentId)) {
        throw new BadRequestError('Invalid assignmentId');
      }

      const updateDoc = {
        ...updates,
        updatedAt: new Date(),
      };

      // Convert ObjectId fields if they are being updated
      if (updates.answerId) {
        const answerIdStr = updates.answerId instanceof ObjectId
          ? updates.answerId.toString()
          : updates.answerId;
        if (typeof answerIdStr === 'string') {
          updateDoc.answerId = new ObjectId(answerIdStr);
        }
      }
      if (updates.reviewerId) {
        const reviewerIdStr = updates.reviewerId instanceof ObjectId
          ? updates.reviewerId.toString()
          : updates.reviewerId;
        if (typeof reviewerIdStr === 'string') {
          updateDoc.reviewerId = new ObjectId(reviewerIdStr);
        }
      }

      const result = await this.reviewerAssignmentsCollection.updateOne(
        { _id: new ObjectId(assignmentId) },
        { $set: updateDoc },
        { session }
      );

      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  }

  async updateAssignmentStatus(
    assignmentId: string,
    status: AssignmentStatus,
    session?: ClientSession,
  ): Promise<{ modifiedCount: number }> {
    return this.updateAssignment(assignmentId, { status, updatedAt: new Date() }, session);
  }

  async deleteAssignment(assignmentId: string, session?: ClientSession): Promise<{ deletedCount: number }> {
    try {
      await this.init();

      if (!assignmentId || !isValidObjectId(assignmentId)) {
        throw new BadRequestError('Invalid assignmentId');
      }

      const result = await this.reviewerAssignmentsCollection.deleteOne(
        { _id: new ObjectId(assignmentId) },
        { session }
      );

      return { deletedCount: result.deletedCount };
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  }

  async getAssignmentStatsForReviewer(
    reviewerId: string,
    session?: ClientSession,
  ): Promise<{
    totalAssignments: number;
    pendingAssignments: number;
    acceptedAssignments: number;
    completedAssignments: number;
    declinedAssignments: number;
  }> {
    try {
      await this.init();

      if (!reviewerId || !isValidObjectId(reviewerId)) {
        throw new BadRequestError('Invalid reviewerId');
      }

      const assignments = await this.getAssignmentsForReviewer(reviewerId, session);

      const stats = {
        totalAssignments: assignments.length,
        pendingAssignments: assignments.filter(a => a.status === 'pending').length,
        acceptedAssignments: assignments.filter(a => a.status === 'accepted').length,
        completedAssignments: assignments.filter(a => a.status === 'completed').length,
        declinedAssignments: assignments.filter(a => a.status === 'declined').length,
      };

      return stats;
    } catch (error) {
      console.error('Error getting assignment stats for reviewer:', error);
      throw error;
    }
  }

  async reassignAssignment(
    assignmentId: string,
    newReviewerId: string,
    session?: ClientSession,
  ): Promise<{ modifiedCount: number }> {
    try {
      await this.init();

      if (!assignmentId || !isValidObjectId(assignmentId)) {
        throw new BadRequestError('Invalid assignmentId');
      }

      if (!newReviewerId || !isValidObjectId(newReviewerId)) {
        throw new BadRequestError('Invalid newReviewerId');
      }

      const updateDoc = {
        reviewerId: new ObjectId(newReviewerId),
        status: 'pending' as AssignmentStatus,
        assignedAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.reviewerAssignmentsCollection.updateOne(
        { _id: new ObjectId(assignmentId) },
        { $set: updateDoc },
        { session }
      );

      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      console.error('Error reassigning assignment:', error);
      throw error;
    }
  }
}
