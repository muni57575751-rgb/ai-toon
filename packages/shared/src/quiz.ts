export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  storyId: string;
  topic: string;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizSubmission {
  quizId: string;
  storyId: string;
  answers: Record<string, string>; // questionId -> selectedOptionId
}

export interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  selectedOptionId: string;
  correctOptionId: string;
  explanation: string;
}

export interface QuizResult {
  quizId: string;
  storyId: string;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  questionResults: QuestionResult[];
  completedAt: string;
}
