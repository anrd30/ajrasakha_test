import { useInfiniteQuery } from "@tanstack/react-query";
import { QuestionService } from "../services/questionService";
import type { QuestionFilter } from "@/components/QA-interface";

const questionService = new QuestionService();

// Mock questions for demonstration
const mockQuestions = [
  {
    id: "q1",
    text: "What are the key principles of continuous learning in AI systems?",
    createdAt: "2024-09-17T10:30:00.000Z",
    updatedAt: "2024-09-17T10:30:00.000Z",
    totalAnwersCount: 3
  },
  {
    id: "q2",
    text: "How can we improve the accuracy of machine learning models for real-world applications?",
    createdAt: "2024-09-17T09:15:00.000Z",
    updatedAt: "2024-09-17T09:15:00.000Z",
    totalAnwersCount: 5
  },
  {
    id: "q3",
    text: "What are the ethical considerations in deploying AI systems in healthcare?",
    createdAt: "2024-09-17T08:45:00.000Z",
    updatedAt: "2024-09-17T08:45:00.000Z",
    totalAnwersCount: 2
  },
  {
    id: "q4",
    text: "How do reinforcement learning algorithms work and what are their applications?",
    createdAt: "2024-09-17T07:20:00.000Z",
    updatedAt: "2024-09-17T07:20:00.000Z",
    totalAnwersCount: 4
  },
  {
    id: "q5",
    text: "What are the challenges in implementing natural language processing for multilingual systems?",
    createdAt: "2024-09-16T16:30:00.000Z",
    updatedAt: "2024-09-16T16:30:00.000Z",
    totalAnwersCount: 1
  }
];

export const useGetAllQuestions = (limit: number, filter: QuestionFilter) => {
  return useInfiniteQuery({
    queryKey: ["questions", limit, filter],
    queryFn: async ({ pageParam }) => {
      try {
        const result = await questionService.getAllQuestions(pageParam, limit, filter);
        // Return API result if successful
        if (result && result.length > 0) {
          return result;
        }
      } catch (error) {
        console.log("API failed, using mock data for demonstration");
      }

      // Fallback to mock data for demonstration
      const startIndex = (pageParam - 1) * limit;
      const endIndex = startIndex + limit;
      const pageData = mockQuestions.slice(startIndex, endIndex);

      return pageData;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage && lastPage.length < limit) return undefined;
      return allPages.length + 1;
    },
  });
};

// Hook for agricultural assistance - fetches questions from MongoDB
export const useGetQuestionsForAssistance = () => {
  return useInfiniteQuery({
    queryKey: ["assistance-questions"],
    queryFn: async ({ pageParam }) => {
      try {
        const response = await fetch(`/api/answers/submissions?page=${pageParam}&limit=10`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.log("API failed, using mock data for demonstration", error);

        // Mock agricultural assistance questions
        const mockAssistanceQuestions = [
          {
            id: "q1",
            text: "How can I improve soil fertility for paddy cultivation without chemical fertilizers?",
            createdAt: "2024-09-17T10:30:00.000Z",
            updatedAt: "2024-09-17T10:30:00.000Z",
            totalAnwersCount: 3,
            response: {
              id: "a1",
              answer: "Use organic compost and green manure. Test soil pH and add lime if needed.",
              isFinalAnswer: false,
              createdAt: "2024-09-17T11:00:00.000Z"
            }
          },
          {
            id: "q2",
            text: "What are the best pest control methods for tomato plants?",
            createdAt: "2024-09-17T09:15:00.000Z",
            updatedAt: "2024-09-17T09:15:00.000Z",
            totalAnwersCount: 2,
            response: {
              id: "a2",
              answer: "Use neem oil spray and introduce beneficial insects like ladybugs.",
              isFinalAnswer: false,
              createdAt: "2024-09-17T09:45:00.000Z"
            }
          }
        ];

        const startIndex = (pageParam - 1) * 10;
        const endIndex = startIndex + 10;
        return mockAssistanceQuestions.slice(startIndex, endIndex);
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage && lastPage.length < 10) return undefined;
      return allPages.length + 1;
    },
  });
};
