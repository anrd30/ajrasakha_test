import { IPeerReview, ReviewStatus, IAnswer, IAnswerRanking, IBlindReviewAssignment, IAnswerMapping } from '#root/shared/interfaces/models.js';

// In-memory storage for peer reviews (replace with database later)
const peerReviews: IPeerReview[] = [];

// Storage for blind reviews
const blindAssignments: IBlindReviewAssignment[] = [];
const answerRankings: IAnswerRanking[] = [];

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

  // ✅ NEW: Determine final answer by comparing all answers for a question
  static determineFinalAnswer(questionId: string): IAnswer | null {
    // Get all answers for this question
    const allAnswers = this.getAllAnswersForQuestion(questionId);

    if (allAnswers.length === 0) return null;

    // Calculate quality scores for each answer
    const answerScores = allAnswers.map(answer => ({
      answer,
      qualityScore: this.calculateAnswerQualityScore(answer._id!.toString()),
      reviewStats: this.calculateSimilarity(answer._id!.toString())
    }));

    // Sort by quality score (highest first)
    answerScores.sort((a, b) => b.qualityScore - a.qualityScore);

    // Return the highest scoring answer
    const bestAnswer = answerScores[0];

    // Mark this answer as final (in a real implementation, this would update the database)
    console.log(`Final answer selected for question ${questionId}: Answer ${bestAnswer.answer._id}`);
    console.log(`Quality Score: ${bestAnswer.qualityScore}, Average Rating: ${bestAnswer.reviewStats.average}`);

    return bestAnswer.answer;
  }

  // ✅ NEW: Calculate comprehensive quality score for an answer
  static calculateAnswerQualityScore(answerId: string): number {
    const similarityData = this.calculateSimilarity(answerId);
    const reviews = this.getCompletedReviewsForAnswer(answerId);

    if (reviews.length === 0) return 0;

    // Factors: average score, consensus, review count, recency
    const averageScore = similarityData.average;
    const reviewCount = similarityData.reviewCount;

    // Calculate consensus (lower standard deviation = higher consensus)
    const scores = reviews.map(r => r.score!);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const consensus = variance > 0 ? 1 / (1 + Math.sqrt(variance)) : 1; // 0-1 scale

    // Quality score combines multiple factors
    const qualityScore = (
      averageScore * 0.5 +      // 50% - raw average rating
      consensus * 0.3 +         // 30% - reviewer agreement
      Math.min(reviewCount / 5, 1) * 0.2  // 20% - review volume (max at 5 reviews)
    );

    return qualityScore;
  }

  // ✅ NEW: Get all answers for a question (placeholder - would query database)
  static getAllAnswersForQuestion(questionId: string): IAnswer[] {
    // In a real implementation, this would query the database
    // For now, return empty array as placeholder
    return [];
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

  // ==================== BLIND REVIEW SYSTEM ====================

  // Create blind review assignment for a reviewer
  static createBlindAssignment(
    reviewerId: string,
    questionId: string,
    answers: IAnswer[]
  ): IBlindReviewAssignment {
    // Filter out reviewer's own answers
    const otherAnswers = answers.filter(answer => answer.authorId.toString() !== reviewerId);

    // Create anonymous mappings
    const answerMappings: IAnswerMapping[] = otherAnswers.map((answer, index) => ({
      anonymousId: `Answer ${String.fromCharCode(65 + index)}`, // A, B, C, etc.
      realAnswerId: answer._id!,
      authorId: answer.authorId
    }));

    const assignment: IBlindReviewAssignment = {
      _id: `blind_${Date.now()}_${Math.random()}`,
      reviewerId,
      questionId,
      answerMappings,
      status: 'assigned',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    blindAssignments.push(assignment);
    return assignment;
  }

  // Get blind assignment for reviewer
  static getBlindAssignment(reviewerId: string, questionId: string): IBlindReviewAssignment | undefined {
    return blindAssignments.find(
      assignment => assignment.reviewerId === reviewerId &&
                   assignment.questionId === questionId
    );
  }

  // Submit blind ranking
  static submitBlindRanking(
    reviewerId: string,
    questionId: string,
    rankings: { anonymousId: string; rank: number }[]
  ): boolean {
    const assignment = this.getBlindAssignment(reviewerId, questionId);
    if (!assignment) return false;

    // Convert rankings to IAnswerRank format with Borda points
    const numAnswers = rankings.length;
    const answerRanks = rankings.map(ranking => {
      const mapping = assignment.answerMappings.find(m => m.anonymousId === ranking.anonymousId)!;
      const bordaPoints = numAnswers - ranking.rank; // n-1 for rank 1, n-2 for rank 2, etc.

      return {
        answerId: mapping.realAnswerId,
        anonymousId: ranking.anonymousId,
        rank: ranking.rank,
        bordaPoints
      };
    });

    const rankingRecord: IAnswerRanking = {
      _id: `ranking_${Date.now()}_${Math.random()}`,
      reviewerId,
      questionId,
      rankings: answerRanks,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    answerRankings.push(rankingRecord);

    // Mark assignment as completed
    assignment.status = 'completed';
    assignment.updatedAt = new Date();

    return true;
  }

  // Calculate Borda Count winner for a question
  static calculateBordaWinner(questionId: string): {
    winner: IAnswer | null;
    rankings: { answerId: string; totalBordaPoints: number; averageRank: number }[];
    totalReviewers: number;
  } {
    // Get all rankings for this question
    const questionRankings = answerRankings.filter(r => r.questionId === questionId);

    if (questionRankings.length === 0) {
      return { winner: null, rankings: [], totalReviewers: 0 };
    }

    // Aggregate Borda points for each answer
    const bordaTotals: { [answerId: string]: { totalPoints: number; ranks: number[] } } = {};

    questionRankings.forEach(ranking => {
      ranking.rankings.forEach(rank => {
        if (!bordaTotals[rank.answerId.toString()]) {
          bordaTotals[rank.answerId.toString()] = { totalPoints: 0, ranks: [] };
        }
        bordaTotals[rank.answerId.toString()].totalPoints += rank.bordaPoints;
        bordaTotals[rank.answerId.toString()].ranks.push(rank.rank);
      });
    });

    // Calculate final rankings
    const finalRankings = Object.entries(bordaTotals).map(([answerId, data]) => ({
      answerId,
      totalBordaPoints: data.totalPoints,
      averageRank: data.ranks.reduce((a, b) => a + b, 0) / data.ranks.length
    }));

    // Sort by Borda points (highest first)
    finalRankings.sort((a, b) => b.totalBordaPoints - a.totalBordaPoints);

    // Find winner (placeholder - would need to get actual answer from database)
    const winner = finalRankings.length > 0 ? this.getAnswerById(finalRankings[0].answerId) : null;

    return {
      winner,
      rankings: finalRankings,
      totalReviewers: questionRankings.length
    };
  }

  // Helper: Get answer by ID (placeholder)
  static getAnswerById(answerId: string): IAnswer | null {
    // In a real implementation, this would query the database
    // For now, return null as placeholder
    return null;
  }

  // Get ranking statistics for a question
  static getRankingStats(questionId: string) {
    const questionRankings = answerRankings.filter(r => r.questionId === questionId);

    return {
      totalReviewers: questionRankings.length,
      completedRankings: questionRankings.filter(r => r.status === 'completed').length,
      averageAnswersPerRanking: questionRankings.length > 0
        ? questionRankings.reduce((sum, r) => sum + r.rankings.length, 0) / questionRankings.length
        : 0
    };
  }
}
