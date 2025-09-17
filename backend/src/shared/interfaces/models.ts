import {ObjectId} from 'mongodb';

export type UserRole = 'admin' | 'user' | 'expert';
export type QuestionStatus = 'open' | 'answered' | 'closed';

export interface IUser {
  _id?: string | ObjectId;
  firebaseUID: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IQuestion {
  _id?: string | ObjectId;
  userId?: ObjectId | string;
  question: string;
  context: ObjectId | string;
  status: QuestionStatus;
  totalAnwersCount: number;
  createdAt?: Date;
  updatedAt?: Date;
  similarity_score?: number;
  reviewCyclecount?: number;
  finalReviewerID?: ObjectId | string;
}

export interface IAnswer {
  _id?: string | ObjectId;
  questionId: string | ObjectId;
  authorId: string | ObjectId;
  answerIteration: number;
  isFinalAnswer: boolean;
  answer: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// For transcripts
export interface IContext {
  _id?: string | ObjectId;
  text: string;
  createdAt?: Date;
}

// Blind review ranking interface
export interface IAnswerRanking {
  _id?: string | ObjectId;
  reviewerId: string | ObjectId;
  questionId: string | ObjectId;
  rankings: IAnswerRank[]; // Ordered list from best to worst
  status: 'in_progress' | 'completed';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAnswerRank {
  answerId: string | ObjectId;
  anonymousId: string; // For blind review (e.g., "Answer A", "Answer B")
  rank: number; // Position in ranking (1 = best, n = worst)
  bordaPoints: number; // Calculated Borda points
}

// Blind review assignment
export interface IBlindReviewAssignment {
  _id?: string | ObjectId;
  reviewerId: string | ObjectId;
  questionId: string | ObjectId;
  answerMappings: IAnswerMapping[]; // Maps anonymous IDs to real answer IDs
  status: 'assigned' | 'in_progress' | 'completed';
  dueDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAnswerMapping {
  anonymousId: string; // "Answer A", "Answer B", etc.
  realAnswerId: string | ObjectId;
  authorId: string | ObjectId; // Hidden from reviewer
}

// Simple peer review interface
export interface IPeerReview {
  _id?: string | ObjectId;
  answerId: string | ObjectId;
  reviewerId: string | ObjectId;
  score?: number; // 1-5 scale (optional until submitted)
  similarity?: number; // 0-1, calculated similarity score (optional until submitted)
  status: ReviewStatus; // Track review state
  comments?: string; // Reviewer's comments
  assignedAt: Date;
  submittedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Reviewer assignment interface
export interface IReviewerAssignment {
  _id?: string | ObjectId;
  answerId: string | ObjectId;
  reviewerId: string | ObjectId;
  assignedAt: Date;
  dueDate?: Date;
  priority: ReviewPriority;
  status: AssignmentStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

// Review status types
export type ReviewStatus = 'assigned' | 'in_progress' | 'submitted' | 'overdue' | 'cancelled';

// Assignment status types
export type AssignmentStatus = 'pending' | 'accepted' | 'declined' | 'completed';

// Review priority levels
export type ReviewPriority = 'low' | 'medium' | 'high' | 'urgent';

// Reviewer profile interface
export interface IReviewerProfile {
  _id?: string | ObjectId;
  userId: string | ObjectId;
  expertise: string[]; // Areas of expertise
  reviewCount: number;
  averageRating: number;
  isActive: boolean;
  maxConcurrentReviews: number;
  currentReviewLoad: number;
  createdAt?: Date;
  updatedAt?: Date;
}
