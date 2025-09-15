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

// Simple peer review interface
export interface IPeerReview {
  _id?: string | ObjectId;
  answerId: string | ObjectId;
  reviewerId: string | ObjectId;
  score: number; // 1-5 scale
  similarity: number; // 0-1, calculated similarity score
  createdAt?: Date;
}
