import { IReviewerAssignment, IReviewerProfile, ReviewPriority, AssignmentStatus } from '#root/shared/interfaces/models.js';
import { ObjectId } from 'mongodb';

// In-memory storage for reviewer assignments (replace with database later)
const reviewerAssignments: IReviewerAssignment[] = [];

// Mock reviewer profiles (replace with database later)
const reviewerProfiles: IReviewerProfile[] = [
  {
    _id: 'reviewer_1',
    userId: 'user_1',
    expertise: ['science', 'technology'],
    reviewCount: 15,
    averageRating: 4.2,
    isActive: true,
    maxConcurrentReviews: 5,
    currentReviewLoad: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'reviewer_2',
    userId: 'user_2',
    expertise: ['mathematics', 'physics'],
    reviewCount: 22,
    averageRating: 4.5,
    isActive: true,
    maxConcurrentReviews: 4,
    currentReviewLoad: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'reviewer_3',
    userId: 'user_3',
    expertise: ['literature', 'history'],
    reviewCount: 8,
    averageRating: 3.8,
    isActive: true,
    maxConcurrentReviews: 6,
    currentReviewLoad: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export class ReviewerAssignmentService {
  // Enhanced reviewer assignment with load balancing
  static async assignReviewersToAnswer(
    answerId: string,
    priority: ReviewPriority = 'medium',
    requiredExpertise?: string[]
  ): Promise<IReviewerAssignment[]> {
    const assignments: IReviewerAssignment[] = [];

    // Get available reviewers based on criteria
    let availableReviewers = reviewerProfiles.filter(
      reviewer => reviewer.isActive &&
                 reviewer.currentReviewLoad < reviewer.maxConcurrentReviews
    );

    // Filter by expertise if specified
    if (requiredExpertise && requiredExpertise.length > 0) {
      availableReviewers = availableReviewers.filter(reviewer =>
        requiredExpertise.some(expertise =>
          reviewer.expertise.includes(expertise)
        )
      );
    }

    // If no reviewers with required expertise, fall back to all available
    if (availableReviewers.length === 0 && requiredExpertise?.length) {
      console.warn(`No reviewers found with expertise: ${requiredExpertise.join(', ')}. Using all available reviewers.`);
      availableReviewers = reviewerProfiles.filter(
        reviewer => reviewer.isActive &&
                   reviewer.currentReviewLoad < reviewer.maxConcurrentReviews
      );
    }

    // Sort by comprehensive scoring algorithm
    availableReviewers.sort((a, b) => {
      const scoreA = this.calculateReviewerScore(a, priority);
      const scoreB = this.calculateReviewerScore(b, priority);
      return scoreB - scoreA; // Higher score first
    });

    // Assign up to 3 reviewers (or fewer if not enough available)
    const reviewersToAssign = availableReviewers.slice(0, Math.min(3, availableReviewers.length));

    for (const reviewer of reviewersToAssign) {
      const assignment: IReviewerAssignment = {
        _id: `assignment_${Date.now()}_${Math.random()}`,
        answerId,
        reviewerId: reviewer._id!,
        assignedAt: new Date(),
        dueDate: new Date(Date.now() + this.getDueDateForPriority(priority)),
        priority,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      assignments.push(assignment);
      reviewerAssignments.push(assignment);

      // Update reviewer's load
      reviewer.currentReviewLoad++;
      reviewer.updatedAt = new Date();
    }

    return assignments;
  }

  // Calculate reviewer score for load balancing
  private static calculateReviewerScore(reviewer: IReviewerProfile, priority: ReviewPriority): number {
    let score = 0;

    // Base score from availability (inverse of load ratio)
    const loadRatio = reviewer.currentReviewLoad / reviewer.maxConcurrentReviews;
    score += (1 - loadRatio) * 30; // 0-30 points

    // Rating score
    score += reviewer.averageRating * 20; // 0-100 points (scaled)

    // Experience score
    score += Math.min(reviewer.reviewCount / 10, 20); // 0-20 points (capped at 200 reviews)

    // Priority bonus
    if (priority === 'high' || priority === 'urgent') {
      score += 10; // Bonus for urgent assignments
    }

    return score;
  }

  // Check reviewer availability
  static isReviewerAvailable(reviewerId: string): boolean {
    const reviewer = reviewerProfiles.find(r => r._id === reviewerId);
    return reviewer ? reviewer.isActive && reviewer.currentReviewLoad < reviewer.maxConcurrentReviews : false;
  }

  // Get reviewer workload statistics
  static getReviewerWorkloadStats(reviewerId: string) {
    const reviewer = reviewerProfiles.find(r => r._id === reviewerId);
    if (!reviewer) return null;

    const assignments = this.getAssignmentsForReviewer(reviewerId);
    const pendingCount = assignments.filter(a => a.status === 'pending').length;
    const activeCount = assignments.filter(a => a.status === 'accepted').length;
    const completedCount = assignments.filter(a => a.status === 'completed').length;

    return {
      reviewerId,
      currentLoad: reviewer.currentReviewLoad,
      maxCapacity: reviewer.maxConcurrentReviews,
      utilizationRate: (reviewer.currentReviewLoad / reviewer.maxConcurrentReviews) * 100,
      pendingAssignments: pendingCount,
      activeAssignments: activeCount,
      completedAssignments: completedCount,
      totalAssignments: assignments.length,
    };
  }

  // Redistribute assignments from overloaded reviewers
  static async redistributeAssignments(): Promise<void> {
    const overloadedReviewers = reviewerProfiles.filter(
      r => r.isActive && r.currentReviewLoad > r.maxConcurrentReviews * 0.8 // 80% capacity
    );

    for (const reviewer of overloadedReviewers) {
      // Find pending assignments that can be reassigned
      const pendingAssignments = reviewerAssignments.filter(
        a => a.reviewerId === reviewer._id && a.status === 'pending'
      );

      for (const assignment of pendingAssignments) {
        // Try to reassign to a less loaded reviewer
        const alternativeReviewer = this.findAlternativeReviewer(reviewer._id.toString(), assignment.priority);

        if (alternativeReviewer) {
          // Reassign the assignment
          assignment.reviewerId = alternativeReviewer._id!.toString();
          assignment.updatedAt = new Date();

          // Update load counts
          reviewer.currentReviewLoad--;
          alternativeReviewer.currentReviewLoad++;

          console.log(`Reassigned assignment ${assignment._id} from ${reviewer._id} to ${alternativeReviewer._id}`);
        }
      }
    }
  }

  // Find alternative reviewer for reassignment
  private static findAlternativeReviewer(excludeReviewerId: string, priority: ReviewPriority): IReviewerProfile | null {
    const availableReviewers = reviewerProfiles.filter(
      r => r._id !== excludeReviewerId &&
           r.isActive &&
           r.currentReviewLoad < r.maxConcurrentReviews
    );

    if (availableReviewers.length === 0) return null;

    // Sort by availability and return the best match
    availableReviewers.sort((a, b) => {
      const scoreA = this.calculateReviewerScore(a, priority);
      const scoreB = this.calculateReviewerScore(b, priority);
      return scoreB - scoreA;
    });

    return availableReviewers[0];
  }

  // Update reviewer availability status
  static updateReviewerAvailability(reviewerId: string, isActive: boolean): boolean {
    const reviewer = reviewerProfiles.find(r => r._id === reviewerId);
    if (!reviewer) return false;

    reviewer.isActive = isActive;
    reviewer.updatedAt = new Date();

    // If deactivating, we might want to reassign their pending work
    if (!isActive) {
      // TODO: Handle reassignment of pending assignments
      console.log(`Reviewer ${reviewerId} is now inactive`);
    }

    return true;
  }

  // Get assignments for a reviewer
  static getAssignmentsForReviewer(reviewerId: string): IReviewerAssignment[] {
    return reviewerAssignments.filter(
      assignment => assignment.reviewerId === reviewerId
    );
  }

  // Update assignment status
  static updateAssignmentStatus(
    assignmentId: string,
    status: AssignmentStatus
  ): boolean {
    const assignment = reviewerAssignments.find(a => a._id === assignmentId);
    if (!assignment) return false;

    assignment.status = status;
    assignment.updatedAt = new Date();

    // If assignment is completed, decrease reviewer's load
    if (status === 'completed') {
      const reviewer = reviewerProfiles.find(r => r._id === assignment.reviewerId);
      if (reviewer && reviewer.currentReviewLoad > 0) {
        reviewer.currentReviewLoad--;
        reviewer.updatedAt = new Date();
      }
    }

    return true;
  }

  // Get reviewer profile
  static getReviewerProfile(reviewerId: string): IReviewerProfile | undefined {
    return reviewerProfiles.find(profile => profile._id === reviewerId);
  }

  // Get all reviewer profiles
  static getAllReviewerProfiles(): IReviewerProfile[] {
    return [...reviewerProfiles];
  }

  // Helper method to calculate due date based on priority
  private static getDueDateForPriority(priority: ReviewPriority): number {
    const now = Date.now();
    switch (priority) {
      case 'urgent':
        return now + 24 * 60 * 60 * 1000; // 24 hours
      case 'high':
        return now + 3 * 24 * 60 * 60 * 1000; // 3 days
      case 'medium':
        return now + 7 * 24 * 60 * 60 * 1000; // 7 days
      case 'low':
        return now + 14 * 24 * 60 * 60 * 1000; // 14 days
      default:
        return now + 7 * 24 * 60 * 60 * 1000; // 7 days default
    }
  }

  // Get assignment by ID
  static getAssignmentById(assignmentId: string): IReviewerAssignment | undefined {
    return reviewerAssignments.find(assignment => assignment._id === assignmentId);
  }

  // Get all assignments for an answer
  static getAssignmentsForAnswer(answerId: string): IReviewerAssignment[] {
    return reviewerAssignments.filter(
      assignment => assignment.answerId === answerId
    );
  }
}
