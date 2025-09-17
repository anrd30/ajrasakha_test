import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api-fetch";

export interface ReviewAssignment {
  assignment: {
    _id: string;
    answerId: string;
    reviewerId: string;
    assignedAt: string;
    dueDate?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'accepted' | 'declined' | 'completed';
  };
  review?: {
    _id: string;
    answerId: string;
    reviewerId: string;
    score?: number;
    comments?: string;
    similarity?: number;
    status: 'assigned' | 'in_progress' | 'submitted' | 'overdue' | 'cancelled';
    assignedAt: string;
    submittedAt?: string;
  };
  // Additional data for demonstration
  question?: {
    id: string;
    text: string;
  };
  answer?: {
    id: string;
    answer: string;
    authorId: string;
    createdAt: string;
  };
}

export interface ReviewStats {
  totalAssignments: number;
  pendingReviews: number;
  completedReviews: number;
  acceptedAssignments: number;
  declinedAssignments: number;
}

// Mock review assignments for demonstration
const mockReviewAssignments: ReviewAssignment[] = [
  {
    assignment: {
      _id: "assign1",
      answerId: "a1",
      reviewerId: "reviewer1",
      assignedAt: "2024-09-17T11:00:00.000Z",
      dueDate: "2024-09-18T11:00:00.000Z",
      priority: "high",
      status: "pending"
    },
    review: {
      _id: "review1",
      answerId: "a1",
      reviewerId: "reviewer1",
      status: "assigned",
      assignedAt: "2024-09-17T11:00:00.000Z"
    },
    question: {
      id: "q1",
      text: "What are the key principles of continuous learning in AI systems?"
    },
    answer: {
      id: "a1",
      answer: "Continuous learning in AI systems involves three key principles: 1) Incremental Learning - updating models with new data without retraining from scratch, 2) Adaptation - adjusting to changing environments and data distributions, and 3) Knowledge Retention - preserving learned knowledge while integrating new information.",
      authorId: "user1",
      createdAt: "2024-09-17T10:35:00.000Z"
    }
  },
  {
    assignment: {
      _id: "assign2",
      answerId: "a4",
      reviewerId: "reviewer1",
      assignedAt: "2024-09-17T10:30:00.000Z",
      dueDate: "2024-09-18T10:30:00.000Z",
      priority: "medium",
      status: "accepted"
    },
    review: {
      _id: "review2",
      answerId: "a4",
      reviewerId: "reviewer1",
      status: "in_progress",
      assignedAt: "2024-09-17T10:30:00.000Z"
    },
    question: {
      id: "q2",
      text: "How can we improve the accuracy of machine learning models for real-world applications?"
    },
    answer: {
      id: "a4",
      answer: "Model accuracy can be improved through: 1) Data Quality Enhancement - cleaning, augmenting, and balancing datasets, 2) Feature Engineering - creating meaningful input representations, 3) Ensemble Methods - combining multiple models, and 4) Regularization Techniques - preventing overfitting.",
      authorId: "user2",
      createdAt: "2024-09-17T09:20:00.000Z"
    }
  }
];

export const useGetMyReviewAssignments = () => {
  return useQuery({
    queryKey: ["review-assignments"],
    queryFn: async (): Promise<ReviewAssignment[]> => {
      try {
        const response = await apiFetch<ReviewAssignment[]>("/reviews/my-assignments");
        if (response && response.length > 0) {
          return response;
        }
      } catch (error) {
        console.log("API failed, using mock data for demonstration");
      }

      // Return mock data for demonstration
      return mockReviewAssignments;
    },
  });
};

export const useGetMyReviewStats = () => {
  return useQuery({
    queryKey: ["review-stats"],
    queryFn: async (): Promise<ReviewStats> => {
      try {
        const response = await apiFetch<ReviewStats>("/reviews/my-stats");
        if (response) {
          return response;
        }
      } catch (error) {
        console.log("API failed, using mock data for demonstration");
      }

      // Return mock data for demonstration
      return {
        totalAssignments: 8,
        pendingReviews: 2,
        completedReviews: 6,
        acceptedAssignments: 7,
        declinedAssignments: 1,
      };
    },
  });
};

export const useSubmitReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      score,
      comments,
      similarity,
    }: {
      reviewId: string;
      score: number;
      comments?: string;
      similarity?: number;
    }) => {
      const response = await apiFetch(`/answers/submit-review/${reviewId}`, {
        method: "POST",
        body: JSON.stringify({ score, comments, similarity }),
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch review assignments and stats
      queryClient.invalidateQueries({ queryKey: ["review-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["review-stats"] });
    },
  });
};

export const useUpdateAssignmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      status,
    }: {
      assignmentId: string;
      status: 'accepted' | 'declined';
    }) => {
      const response = await apiFetch(`/reviews/assignment/${assignmentId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch review assignments and stats
      queryClient.invalidateQueries({ queryKey: ["review-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["review-stats"] });
    },
  });
};
