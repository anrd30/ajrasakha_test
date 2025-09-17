import { ClientSession, ObjectId } from 'mongodb';
import { IReviewerAssignment, AssignmentStatus, ReviewPriority } from '#root/shared/interfaces/models.js';

/**
 * Interface representing a repository for reviewer assignment-related operations.
 */
export interface IReviewerAssignmentRepository {
  /**
   * Creates a new reviewer assignment.
   * @param assignment - The assignment data to create.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to the created assignment.
   */
  createAssignment(
    assignment: Omit<IReviewerAssignment, '_id' | 'createdAt' | 'updatedAt'>,
    session?: ClientSession,
  ): Promise<IReviewerAssignment>;

  /**
   * Retrieves a reviewer assignment by its ID.
   * @param assignmentId - The ID of the assignment.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to the assignment or null.
   */
  getAssignmentById(assignmentId: string, session?: ClientSession): Promise<IReviewerAssignment | null>;

  /**
   * Retrieves all assignments for a specific answer.
   * @param answerId - The ID of the answer.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to an array of assignments.
   */
  getAssignmentsForAnswer(answerId: string, session?: ClientSession): Promise<IReviewerAssignment[]>;

  /**
   * Retrieves all assignments for a specific reviewer.
   * @param reviewerId - The ID of the reviewer.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to an array of assignments.
   */
  getAssignmentsForReviewer(reviewerId: string, session?: ClientSession): Promise<IReviewerAssignment[]>;

  /**
   * Retrieves pending assignments for a specific reviewer.
   * @param reviewerId - The ID of the reviewer.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to an array of pending assignments.
   */
  getPendingAssignmentsForReviewer(reviewerId: string, session?: ClientSession): Promise<IReviewerAssignment[]>;

  /**
   * Updates a reviewer assignment.
   * @param assignmentId - The ID of the assignment to update.
   * @param updates - Partial object containing the fields to update.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to the update result.
   */
  updateAssignment(
    assignmentId: string,
    updates: Partial<IReviewerAssignment>,
    session?: ClientSession,
  ): Promise<{ modifiedCount: number }>;

  /**
   * Updates the status of a reviewer assignment.
   * @param assignmentId - The ID of the assignment.
   * @param status - The new status.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to the update result.
   */
  updateAssignmentStatus(
    assignmentId: string,
    status: AssignmentStatus,
    session?: ClientSession,
  ): Promise<{ modifiedCount: number }>;

  /**
   * Deletes a reviewer assignment by its ID.
   * @param assignmentId - The ID of the assignment to delete.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to the delete result.
   */
  deleteAssignment(assignmentId: string, session?: ClientSession): Promise<{ deletedCount: number }>;

  /**
   * Gets assignment statistics for a reviewer.
   * @param reviewerId - The ID of the reviewer.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to assignment statistics.
   */
  getAssignmentStatsForReviewer(
    reviewerId: string,
    session?: ClientSession,
  ): Promise<{
    totalAssignments: number;
    pendingAssignments: number;
    acceptedAssignments: number;
    completedAssignments: number;
    declinedAssignments: number;
  }>;

  /**
   * Reassigns an assignment to a different reviewer.
   * @param assignmentId - The ID of the assignment to reassign.
   * @param newReviewerId - The ID of the new reviewer.
   * @param session - Optional MongoDB client session for transactions.
   * @returns A promise that resolves to the update result.
   */
  reassignAssignment(
    assignmentId: string,
    newReviewerId: string,
    session?: ClientSession,
  ): Promise<{ modifiedCount: number }>;
}
