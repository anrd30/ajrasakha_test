import {IAnswerRepository} from '#root/shared/database/interfaces/IAnswerRepository.js';
import {IQuestionRepository} from '#root/shared/database/interfaces/IQuestionRepository.js';
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

  async deleteAnswer(
    questionId: string,
    answerId: string,
  ): Promise<{deletedCount: number}> {
    return this._withTransaction(async (session: ClientSession) => {
      const answer = await this.answerRepo.getById(answerId);
      if (!answer) {
        throw new BadRequestError(`Answer with ID ${answerId} not found`);
      }
      const question = await this.questionRepo.getById(questionId);

      if (!question) {
        throw new BadRequestError(`Question with ID ${questionId} not found`);
      }
      const updatedAnswerCount = question.totalAnwersCount - 1;

      const isFinalAnswer = answer.isFinalAnswer;

      await this.questionRepo.updateQuestion(
        questionId,
        {
          totalAnwersCount: updatedAnswerCount,
          status: isFinalAnswer ? 'open' : 'closed',
        },
        session,
      );

      return this.answerRepo.deleteAnswer(answerId, session);
    });
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

        // TODO: Save review to database
        // await PeerReviewService.createReview(review);
      }

      console.log(`Assigned ${assignments.length} reviewers to answer ${answerId}`);
    } catch (error) {
      console.error('Error assigning reviewers:', error);
      // Continue execution even if reviewer assignment fails
      // The answer can still be submitted without reviewers initially
    }
  }
}
