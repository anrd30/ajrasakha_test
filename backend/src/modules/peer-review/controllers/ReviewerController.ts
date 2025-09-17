import 'reflect-metadata';
import {
  JsonController,
  Get,
  Post,
  Patch,
  Param,
  Body,
  HttpCode,
  CurrentUser,
  Authorized,
} from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { inject } from 'inversify';
import { GLOBAL_TYPES } from '#root/types.js';
import { BadRequestErrorResponse } from '#shared/middleware/errorHandler.js';
import { IPeerReview, IReviewerAssignment, IUser } from '#root/shared/interfaces/models.js';
import { PeerReviewService } from '#root/shared/peer-review-service.js';
import { ReviewerAssignmentService } from '#root/shared/reviewer-assignment-service.js';
import { IPeerReviewRepository } from '#root/shared/database/interfaces/IPeerReviewRepository.js';
import { IReviewerAssignmentRepository } from '#root/shared/database/interfaces/IReviewerAssignmentRepository.js';

@OpenAPI({
  tags: ['Reviews'],
  description: 'Operations for peer review management',
})
@JsonController('/reviews')
export class ReviewerController {
  constructor(
    @inject(GLOBAL_TYPES.PeerReviewRepository)
    private readonly peerReviewRepo: IPeerReviewRepository,

    @inject(GLOBAL_TYPES.ReviewerAssignmentRepository)
    private readonly reviewerAssignmentRepo: IReviewerAssignmentRepository,
  ) {}

  // Get all pending reviews for the current reviewer
  @Get('/my-assignments')
  @HttpCode(200)
  @Authorized()
  @OpenAPI({ summary: 'Get all review assignments for the current reviewer' })
  async getMyReviewAssignments(@CurrentUser() user: IUser) {
    const reviewerId = user._id.toString();

    // Get review assignments for this reviewer
    const assignments = await this.reviewerAssignmentRepo.getAssignmentsForReviewer(reviewerId);

    // Get corresponding review details
    const reviewsWithDetails = await Promise.all(assignments.map(async (assignment) => {
      const review = await this.peerReviewRepo.getReviewById(assignment._id!.toString());
      return {
        assignment,
        review,
      };
    }));

    return reviewsWithDetails;
  }

  // Submit a review
  @Post('/submit/:reviewId')
  @HttpCode(200)
  @Authorized()
  @OpenAPI({ summary: 'Submit a completed peer review' })
  async submitReview(
    @Param('reviewId') reviewId: string,
    @Body() body: {
      score: number;
      comments?: string;
      similarity?: number;
    },
    @CurrentUser() user: IUser
  ) {
    const reviewerId = user._id.toString();

    // Verify the review belongs to this reviewer
    const review = await this.peerReviewRepo.getReviewById(reviewId);
    if (!review || review.reviewerId.toString() !== reviewerId) {
      throw new Error('Review not found or access denied');
    }

    // Submit the review
    await this.peerReviewRepo.submitReview(
      reviewId,
      body.score,
      body.comments,
      body.similarity
    );

    // Update assignment status
    const assignment = (await this.reviewerAssignmentRepo.getAssignmentsForAnswer(review.answerId.toString()))
      .find(a => a.reviewerId.toString() === reviewerId);

    if (assignment) {
      await this.reviewerAssignmentRepo.updateAssignmentStatus(assignment._id!.toString(), 'completed');
    }

    return { success: true, message: 'Review submitted successfully' };
  }

  // Update review status (accept/decline assignment)
  @Patch('/assignment/:assignmentId/status')
  @HttpCode(200)
  @Authorized()
  @OpenAPI({ summary: 'Update assignment status (accept/decline)' })
  async updateAssignmentStatus(
    @Param('assignmentId') assignmentId: string,
    @Body() body: { status: 'accepted' | 'declined' },
    @CurrentUser() user: IUser
  ) {
    const reviewerId = user._id.toString();

    const assignment = await this.reviewerAssignmentRepo.getAssignmentById(assignmentId);
    if (!assignment || assignment.reviewerId.toString() !== reviewerId) {
      throw new Error('Assignment not found or access denied');
    }

    await this.reviewerAssignmentRepo.updateAssignmentStatus(
      assignmentId,
      body.status
    );

    return { success: true, message: `Assignment ${body.status}` };
  }

  // Get review statistics for the current reviewer
  @Get('/my-stats')
  @HttpCode(200)
  @Authorized()
  @OpenAPI({ summary: 'Get review statistics for the current reviewer' })
  async getMyReviewStats(@CurrentUser() user: IUser) {
    const reviewerId = user._id.toString();

    const assignments = await this.reviewerAssignmentRepo.getAssignmentsForReviewer(reviewerId);
    const pendingReviews = await this.peerReviewRepo.getPendingReviewsForReviewer(reviewerId);

    const stats = {
      totalAssignments: assignments.length,
      pendingReviews: pendingReviews.length,
      completedReviews: assignments.filter(a => a.status === 'completed').length,
      acceptedAssignments: assignments.filter(a => a.status === 'accepted').length,
      declinedAssignments: assignments.filter(a => a.status === 'declined').length,
    };

    return stats;
  }
}
