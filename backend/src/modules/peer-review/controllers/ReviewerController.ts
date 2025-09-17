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

@OpenAPI({
  tags: ['Reviews'],
  description: 'Operations for peer review management',
})
@JsonController('/reviews')
export class ReviewerController {
  // Get all pending reviews for the current reviewer
  @Get('/my-assignments')
  @HttpCode(200)
  @Authorized()
  @OpenAPI({ summary: 'Get all review assignments for the current reviewer' })
  async getMyReviewAssignments(@CurrentUser() user: IUser) {
    const reviewerId = user._id.toString();

    // Get review assignments for this reviewer
    const assignments = ReviewerAssignmentService.getAssignmentsForReviewer(reviewerId);

    // Get corresponding review details
    const reviewsWithDetails = assignments.map(assignment => {
      const review = PeerReviewService.getReviewById(assignment._id!.toString());
      return {
        assignment,
        review,
      };
    });

    return reviewsWithDetails;
  }

  // Get a specific review assignment details
  @Get('/assignment/:assignmentId')
  @HttpCode(200)
  @Authorized()
  @OpenAPI({ summary: 'Get details of a specific review assignment' })
  async getReviewAssignment(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: IUser
  ) {
    const reviewerId = user._id.toString();

    const assignment = ReviewerAssignmentService.getAssignmentById(assignmentId.toString());
    if (!assignment || assignment.reviewerId !== reviewerId) {
      throw new Error('Review assignment not found or access denied');
    }

    // TODO: Get the actual answer content from the database
    // For now, return assignment details
    return {
      assignment,
      // TODO: Include answer content, question details, etc.
    };
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
    const review = PeerReviewService.getReviewById(reviewId);
    if (!review || review.reviewerId.toString() !== reviewerId) {
      throw new Error('Review not found or access denied');
    }

    // Submit the review
    const success = PeerReviewService.submitReview(
      reviewId,
      body.score,
      body.comments,
      body.similarity
    );

    if (!success) {
      throw new Error('Failed to submit review');
    }

    // Update assignment status
    const assignment = ReviewerAssignmentService.getAssignmentsForAnswer(review.answerId.toString())
      .find(a => a.reviewerId === reviewerId);

    if (assignment) {
      ReviewerAssignmentService.updateAssignmentStatus(assignment._id!.toString(), 'completed');
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

    const assignment = ReviewerAssignmentService.getAssignmentById(assignmentId);
    if (!assignment || assignment.reviewerId.toString() !== reviewerId) {
      throw new Error('Assignment not found or access denied');
    }

    const success = ReviewerAssignmentService.updateAssignmentStatus(
      assignmentId,
      body.status
    );

    if (!success) {
      throw new Error('Failed to update assignment status');
    }

    return { success: true, message: `Assignment ${body.status}` };
  }

  // Get review statistics for the current reviewer
  @Get('/my-stats')
  @HttpCode(200)
  @Authorized()
  @OpenAPI({ summary: 'Get review statistics for the current reviewer' })
  async getMyReviewStats(@CurrentUser() user: IUser) {
    const reviewerId = user._id.toString();

    const assignments = ReviewerAssignmentService.getAssignmentsForReviewer(reviewerId);
    const pendingReviews = PeerReviewService.getPendingReviewsForReviewer(reviewerId);

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
