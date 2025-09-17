import { useQuery } from "@tanstack/react-query";
import { QuestionService } from "../services/questionService";
import type { IQuestion } from "@/types";

const questionService = new QuestionService();

// Mock question details with answers for demonstration
const mockQuestionDetails = {
  q1: {
    id: "q1",
    text: "What are the key principles of continuous learning in AI systems?",
    createdAt: "17 Sep 2024, 10:30",
    updatedAt: "17 Sep 2024, 10:30",
    totalAnwersCount: 3,
    currentAnswers: [
      {
        id: "a1",
        answer: "Continuous learning in AI systems involves three key principles: 1) Incremental Learning - updating models with new data without retraining from scratch, 2) Adaptation - adjusting to changing environments and data distributions, and 3) Knowledge Retention - preserving learned knowledge while integrating new information.",
        isFinalAnswer: true,
        createdAt: "2024-09-17T10:35:00.000Z"
      },
      {
        id: "a2",
        answer: "The core principles include: data efficiency (learning from fewer examples), catastrophic forgetting prevention, and meta-learning capabilities that allow systems to learn how to learn.",
        isFinalAnswer: false,
        createdAt: "2024-09-17T10:40:00.000Z"
      },
      {
        id: "a3",
        answer: "Key aspects involve online learning techniques, transfer learning from related domains, and robust validation methods to ensure model reliability during continuous updates.",
        isFinalAnswer: false,
        createdAt: "2024-09-17T10:45:00.000Z"
      }
    ]
  },
  q2: {
    id: "q2",
    text: "How can we improve the accuracy of machine learning models for real-world applications?",
    createdAt: "17 Sep 2024, 09:15",
    updatedAt: "17 Sep 2024, 09:15",
    totalAnwersCount: 5,
    currentAnswers: [
      {
        id: "a4",
        answer: "Model accuracy can be improved through: 1) Data Quality Enhancement - cleaning, augmenting, and balancing datasets, 2) Feature Engineering - creating meaningful input representations, 3) Ensemble Methods - combining multiple models, and 4) Regularization Techniques - preventing overfitting.",
        isFinalAnswer: true,
        createdAt: "2024-09-17T09:20:00.000Z"
      },
      {
        id: "a5",
        answer: "Hyperparameter tuning, cross-validation, and domain-specific feature selection are crucial for real-world accuracy improvements.",
        isFinalAnswer: false,
        createdAt: "2024-09-17T09:25:00.000Z"
      }
    ]
  },
  q3: {
    id: "q3",
    text: "What are the ethical considerations in deploying AI systems in healthcare?",
    createdAt: "17 Sep 2024, 08:45",
    updatedAt: "17 Sep 2024, 08:45",
    totalAnwersCount: 2,
    currentAnswers: [
      {
        id: "a6",
        answer: "Healthcare AI ethics include: patient privacy protection, algorithmic bias mitigation, transparency in decision-making processes, accountability for AI errors, and ensuring human oversight in critical medical decisions.",
        isFinalAnswer: true,
        createdAt: "2024-09-17T08:50:00.000Z"
      },
      {
        id: "a7",
        answer: "Key considerations involve informed consent, data security, equitable access to AI benefits, and the balance between automation efficiency and human clinical judgment.",
        isFinalAnswer: false,
        createdAt: "2024-09-17T08:55:00.000Z"
      }
    ]
  }
};

export const useGetQuestionById = (questionId: string | null) => {
  const { data, isLoading, error } = useQuery<IQuestion | null, Error>({
    queryKey: ["question", questionId],
    queryFn: async () => {
      if (!questionId) return null;

      try {
        const result = await questionService.getQuestionById(questionId);
        if (result) return result;
      } catch (error) {
        console.log("API failed, using mock data for demonstration");
      }

      // Return mock data for the requested question
      return mockQuestionDetails[questionId as keyof typeof mockQuestionDetails] || null;
    },
    enabled: !!questionId,
  });

  return { data, isLoading, error };
};
