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
}

export interface ReviewStats {
  totalAssignments: number;
  pendingReviews: number;
  completedReviews: number;
  acceptedAssignments: number;
  declinedAssignments: number;
}

export const useGetMyReviewAssignments = () => {
  return useQuery({
    queryKey: ["review-assignments"],
    queryFn: async (): Promise<ReviewAssignment[]> => {
      const response = await apiFetch<ReviewAssignment[]>("/reviews/my-assignments");
      return response || [];
    },
  });
};

export const useGetMyReviewStats = () => {
  return useQuery({
    queryKey: ["review-stats"],
    queryFn: async (): Promise<ReviewStats> => {
      const response = await apiFetch<ReviewStats>("/reviews/my-stats");
      return response || {
        totalAssignments: 0,
        pendingReviews: 0,
        completedReviews: 0,
        acceptedAssignments: 0,
        declinedAssignments: 0,
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
