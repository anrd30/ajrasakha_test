import {IAnswerRepository} from '#root/shared/database/interfaces/IAnswerRepository.js';
import {IQuestionRepository} from '#root/shared/database/interfaces/IQuestionRepository.js';
import {IPeerReviewRepository} from '#root/shared/database/interfaces/IPeerReviewRepository.js';
import {IReviewerAssignmentRepository} from '#root/shared/database/interfaces/IReviewerAssignmentRepository.js';
import {BaseService, MongoDatabase} from '#root/shared/index.js';
import {GLOBAL_TYPES} from '#root/types.js';
import {inject, injectable} from 'inversify';
import {ClientSession} from 'mongodb';
import {IAnswer} from '#root/shared/interfaces/models.js';
import {BadRequestError} from 'routing-controllers';
import {PeerReviewService} from '#root/shared/peer-review-service.js';
import {ReviewerAssignmentService} from '#root/shared/reviewer-assignment-service.js';
import {IReviewerAssignment, ReviewPriority} from '#root/shared/interfaces/models.js';
import {
  SubmissionResponse,
  UpdateAnswerBody,
} from '../classes/validators/AnswerValidators.js';
@injectable()
export class AnswerService extends BaseService {
  constructor(
    @inject(GLOBAL_TYPES.AnswerRepository)
    private readonly answerRepo: IAnswerRepository,

    @inject(GLOBAL_TYPES.QuestionRepository)
    private readonly questionRepo: IQuestionRepository,

    @inject(GLOBAL_TYPES.PeerReviewRepository)
    private readonly peerReviewRepo: IPeerReviewRepository,

    @inject(GLOBAL_TYPES.ReviewerAssignmentRepository)
    private readonly reviewerAssignmentRepo: IReviewerAssignmentRepository,

    @inject(GLOBAL_TYPES.Database)
    private readonly mongoDatabase: MongoDatabase,
  ) {
    super(mongoDatabase);
  }

  async addAnswer(
    questionId: string,
    authorId: string,
    answer: string,
  ): Promise<{insertedId: string; isFinalAnswer: boolean}> {
    return this._withTransaction(async (session: ClientSession) => {
      const question = await this.questionRepo.getById(questionId, session);

      if (!question) {
        throw new BadRequestError(`Question with ID ${questionId} not found`);
      }

      const isQuestionClosed = question.status === 'closed';

      if (isQuestionClosed) {
        throw new BadRequestError(`Question is already closed`);
      }

      const isAlreadyResponded = await this.answerRepo.getByAuthorId(
        authorId,
        questionId,
        session,
      );

      if (isAlreadyResponded) {
        throw new BadRequestError('You’ve already submitted an answer!');
      }

      const isFinalAnswer = true; // Need to calculate properly
      const updatedAnswerCount = question.totalAnwersCount + 1;

      const insertedId = await this.answerRepo.addAnswer(
        questionId,
        authorId,
        answer,
        isFinalAnswer,
        updatedAnswerCount,
        session,
      );

      // Assign reviewers to the new answer (replace mock reviews)
      await this.assignReviewersToAnswer(insertedId.insertedId, session);

      // For now, don't check similarity threshold immediately - wait for real reviews
      const finalAnswer = false;

      // Update answer if threshold reached
      if (finalAnswer) {
        await this.answerRepo.updateAnswer(insertedId.insertedId, { isFinalAnswer: true }, session);
      }

      await this.questionRepo.updateQuestion(
        questionId,
        {
          totalAnwersCount: updatedAnswerCount,
          status: finalAnswer ? 'closed' : 'open',
        },
        session,
      );

      return {...insertedId, isFinalAnswer: finalAnswer};
    });
  }

  async getSubmissions(
    userId: string,
    page: number,
    limit: number,
  ): Promise<SubmissionResponse[]> {
    return await this.answerRepo.getAllSubmissions(userId, page, limit);
  }

  async updateAnswer(
    answerId: string,
    updates: UpdateAnswerBody,
  ): Promise<{modifiedCount: number}> {
    return this._withTransaction(async (session: ClientSession) => {
      if (!answerId) throw new BadRequestError('AnswerId not found');
      const answer = await this.answerRepo.getById(answerId, session);

      console.log('Answer: ', answer);
      if (!answer) {
        throw new BadRequestError(`Answer with ID ${answerId} not found`);
      }
      const questionId = answer.questionId.toString();

      const question = await this.questionRepo.getById(questionId);

      if (!question) {
        throw new BadRequestError(`Question with ID ${questionId} not found`);
      }

      // const answers = await this.answerRepo.getByQuestionId(
      //   questionId,
      //   session,
      // );

      // const otherFinalAnswer = answers.find(
      //   (answer: IAnswer) =>
      //     answer.isFinalAnswer && answer._id?.toString() !== answerId,
      // );
      // if (otherFinalAnswer) {
      //   throw new BadRequestError(
      //     `Another final answer already exists for question ${questionId}`,
      //   );
      // }

      return this.answerRepo.updateAnswer(answerId, updates, session);
    });
  }

  async submitReview(
    reviewerId: string,
    reviewId: string,
    score: number,
    comments?: string,
    similarity?: number,
  ): Promise<{ submitted: boolean; triggersNextRound: boolean }> {
    return this._withTransaction(async (session: ClientSession) => {
      // Submit the review using the repository
      await this.peerReviewRepo.submitReview(
        reviewId,
        score,
        comments,
        similarity,
        session
      );

      // Update assignment status to completed
      const review = await this.peerReviewRepo.getReviewById(reviewId, session);
      if (review) {
        const assignments = await this.reviewerAssignmentRepo.getAssignmentsForAnswer(review.answerId.toString(), session);
        const assignment = assignments.find(a => a.reviewerId.toString() === reviewerId);
        if (assignment) {
          await this.reviewerAssignmentRepo.updateAssignmentStatus(assignment._id!.toString(), 'completed', session);
        }
      }

      // Check if we should trigger the next round of review
      const triggersNextRound = await this.checkAndTriggerNextReviewRound(reviewId, session);

      return { submitted: true, triggersNextRound };
    });
  }

  private async checkAndTriggerNextReviewRound(reviewId: string, session: ClientSession): Promise<boolean> {
    const review = await this.peerReviewRepo.getReviewById(reviewId, session);
    if (!review) return false;

    const answerId = review.answerId.toString();

    // Get review stats for this answer
    const reviewStats = await this.peerReviewRepo.getReviewStatsForAnswer(answerId, session);

    // Check if we have enough reviews and if the threshold is met
    if (reviewStats.completedReviews >= 2 && reviewStats.thresholdReached) {
      // Trigger next round - assign new reviewers
      await this.assignNextRoundReviewers(answerId, session);
      return true;
    }

    return false;
  }

  private async assignNextRoundReviewers(answerId: string, session: ClientSession): Promise<void> {
    try {
      // Get existing assignments to avoid assigning to the same reviewers
      const existingAssignments = await this.reviewerAssignmentRepo.getAssignmentsForAnswer(answerId, session);
      const existingReviewerIds = existingAssignments.map(a => a.reviewerId.toString());

      // Assign reviewers excluding those who already reviewed
      const assignments = await ReviewerAssignmentService.assignReviewersToAnswer(
        answerId,
        'medium',
        undefined, // We'll need to modify the service to exclude certain reviewers
        existingReviewerIds
      );

      // Create corresponding review records for each assignment
      for (const assignment of assignments) {
        const review = {
          answerId,
          reviewerId: assignment.reviewerId,
          status: 'assigned' as const,
          assignedAt: assignment.assignedAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Save review to database using repository
        await this.peerReviewRepo.createReview(review, session);

        // Save assignment to database using repository
        await this.reviewerAssignmentRepo.createAssignment(assignment, session);
      }

      console.log(`Assigned next round reviewers to answer ${answerId}`);
    } catch (error) {
      console.error('Error assigning next round reviewers:', error);
      // Continue execution even if next round assignment fails
    }
  }

  // Assign reviewers to an answer
  private async assignReviewersToAnswer(
    answerId: string,
    session: ClientSession
  ): Promise<void> {
    try {
      // Assign reviewers using the assignment service
      const assignments = await ReviewerAssignmentService.assignReviewersToAnswer(
        answerId,
        'medium' as ReviewPriority // TODO: Determine priority based on question type/urgency
      );

      // Create corresponding review records for each assignment
      for (const assignment of assignments) {
        const review = {
          answerId,
          reviewerId: assignment.reviewerId,
          status: 'assigned' as const,
          assignedAt: assignment.assignedAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Save review to database using repository
        await this.peerReviewRepo.createReview(review, session);

        // Save assignment to database using repository
        await this.reviewerAssignmentRepo.createAssignment(assignment, session);
      }

      console.log(`Assigned ${assignments.length} reviewers to answer ${answerId}`);
    } catch (error) {
      console.error('Error assigning reviewers:', error);
      // Continue execution even if reviewer assignment fails
      // The answer can still be submitted without reviewers initially
    }
  }
}
