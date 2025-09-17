import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './atoms/card';
import { Button } from './atoms/button';
import { Textarea } from './atoms/textarea';
import { Label } from './atoms/label';
import { RadioGroup, RadioGroupItem } from './atoms/radio-group';
import { Badge } from './atoms/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './atoms/tabs';
import { Star, MessageSquare, GripVertical, Trophy } from 'lucide-react';
import {
  useGetMyReviewStats,
  useSubmitReview,
  type ReviewAssignment
} from '@/hooks/api/peer-review';
import { useGetQuestionsForAssistance } from '@/hooks/api/question/useGetAllQuestions';
import toast from 'react-hot-toast';

type ReviewFormData = {
  score: string;
  comments: string;
  similarity: string;
};

type RankingItem = {
  id: string;
  anonymousId: string;
  content: string;
  rank: number;
};

const getRandomPriority = (): 'low' | 'medium' | 'high' | 'urgent' => {
  const priorities: ('low' | 'medium' | 'high' | 'urgent')[] = ['low', 'medium', 'high', 'urgent'];
  return priorities[Math.floor(Math.random() * priorities.length)];
};

export const ReviewerInterface = () => {
  const [selectedAssignment, setSelectedAssignment] = useState<ReviewAssignment | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewFormData>({
    score: '',
    comments: '',
    similarity: ''
  });
  
  // Blind review state
  const [isBlindReview, setIsBlindReview] = useState(false);
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // API hooks
  const { data: assignmentsData, isLoading: assignmentsLoading } = useGetQuestionsForAssistance();
  const { data: statsData, isLoading: statsLoading } = useGetMyReviewStats();
  // Drag and drop handlers for ranking
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = rankings.findIndex(item => item.id === draggedItem);
    const targetIndex = rankings.findIndex(item => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newRankings = [...rankings];
    const [draggedRankingItem] = newRankings.splice(draggedIndex, 1);
    newRankings.splice(targetIndex, 0, draggedRankingItem);

    // Update ranks based on new order
    const updatedRankings = newRankings.map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    setRankings(updatedRankings);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Initialize rankings when entering blind review mode
  useEffect(() => {
    if (isBlindReview && selectedAssignment) {
      // Mock anonymous answers for demonstration
      const mockAnonymousAnswers = [
        {
          id: 'answer_1',
          anonymousId: 'Answer A',
          content: 'For paddy cultivation, ensure proper water management with 2-3 inches of standing water during vegetative stage. Use organic fertilizers like vermicompost and neem cake.',
          rank: 1
        },
        {
          id: 'answer_2', 
          anonymousId: 'Answer B',
          content: 'Consider crop rotation with legumes to improve soil fertility. Test soil pH and adjust accordingly. For irrigation, drip irrigation systems are more efficient.',
          rank: 2
        },
        {
          id: 'answer_3',
          anonymousId: 'Answer C', 
          content: 'Implement integrated pest management strategies. Monitor pest populations regularly and use biological control methods when possible.',
          rank: 3
        }
      ];
      setRankings(mockAnonymousAnswers);
    }
  }, [isBlindReview, selectedAssignment]);

  const submitReviewMutation = useSubmitReview();

  const handleSubmitReview = async () => {
    if (!selectedAssignment) return;
    try {
      if (isBlindReview) {
        // Submit blind rankings
        const rankingData = rankings.map(r => ({
          anonymousId: r.anonymousId,
          rank: r.rank
        }));
        
        // Here you would call the blind ranking API
        console.log('Submitting blind rankings:', rankingData);
        toast.success('Blind rankings submitted successfully');
        
        // Reset rankings
        setRankings([]);
      } else {
        // Submit traditional review
        await submitReviewMutation.mutateAsync({
          reviewId: selectedAssignment.assignment._id,
          score: parseInt(reviewForm.score),
          comments: reviewForm.comments,
          similarity: reviewForm.similarity ? parseFloat(reviewForm.similarity) : undefined
        });
        toast.success('Assistance submitted successfully');
        setReviewForm({ score: '', comments: '', similarity: '' });
      }
    } catch (error) {
      console.error('Submission failed:', error);
      toast.error('Failed to submit review');
    }
  };

  const assignments = assignmentsData?.pages.flat() || [];
  const stats = statsData || {
    totalAssignments: 0,
    pendingReviews: 0,
    completedReviews: 0,
    acceptedAssignments: 0,
    declinedAssignments: 0,
  };


  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Agricultural Assistance Dashboard</h1>
        <p className="text-gray-600">Provide expert agricultural assistance and learn from other assistants</p>
      </div>

      <Tabs defaultValue="assignments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="assignments">My Questions</TabsTrigger>
          <TabsTrigger value="stats">Assistance Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-6">
          {assignmentsLoading ? (
            <div className="text-center py-8">Loading assignments...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assignments List */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Questions for Assistance</h2>
                <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-2 assignment-list">
                  {assignments.map((question) => {
                    const priority = getRandomPriority();
                    return (
                    <Card
                      key={question.id}
                      className={`cursor-pointer transition-colors ${
                        selectedAssignment?.assignment._id === question.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedAssignment({
                        assignment: {
                          _id: question.id,
                          status: 'pending',
                          priority: priority,
                          assignedAt: new Date(question.createdAt).toISOString(),
                          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                          reviewerId: '', // Will be set by backend
                          answerId: question.response?.id || ''
                        },
                        question: {
                          text: question.text,
                          id: question.id
                        }
                      })}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2 line-clamp-2">
                              Question #{question.id.slice(-6)}
                            </CardTitle>
                            <div className="flex gap-2 mb-2">
                              <Badge variant="outline" className="text-green-600">
                                Agricultural Question
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className={`${
                                  priority === 'high' || priority === 'urgent' ? 'text-red-600' : 
                                  priority === 'low' ? 'text-gray-600' : 
                                  'text-yellow-600'
                                }`}
                              >
                                Priority: {priority.charAt(0).toUpperCase() + priority.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              Posted {new Date(question.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm line-clamp-3 mb-3">
                          {question.text}
                        </p>
                        <p className="text-xs text-gray-500">
                          {question.totalAnwersCount} answers • {question.response ? 'Has your response' : 'Needs assistance'}
                        </p>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              </div>

            {/* Agricultural Assistance Form */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Agricultural Assistance</h2>
              {selectedAssignment ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Question for Assistance</CardTitle>
                    <p className="text-sm text-gray-600">
                      Question #{selectedAssignment.assignment._id.slice(-6)}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Question Display */}
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Question:
                      </Label>
                      <p className="text-base mt-2 p-4 rounded-md border border-gray-200 bg-gray-50">
                        {selectedAssignment.question?.text || 'Question text not available'}
                      </p>
                    </div>

                    {/* Review Mode Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Review Mode:</Label>
                        <p className="text-xs text-gray-600">
                          {isBlindReview 
                            ? "Anonymous ranking - prevents bias" 
                            : "Traditional rating - see author names"
                          }
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsBlindReview(!isBlindReview)}
                        className="flex items-center gap-2"
                      >
                        <Trophy className="w-4 h-4" />
                        {isBlindReview ? "Traditional Mode" : "Blind Review Mode"}
                      </Button>
                    </div>

                    {/* Other Assistants' Answers */}
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground mb-3 block">
                        {isBlindReview ? "Anonymous Answers to Rank:" : "Other Agricultural Assistants' Answers:"}
                      </Label>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {isBlindReview ? (
                          // Blind Review Mode - Anonymous Ranking
                          <div className="space-y-3">
                            {rankings.map((item) => (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item.id)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, item.id)}
                                onDragEnd={handleDragEnd}
                                className={`p-4 border border-gray-200 rounded-lg bg-white cursor-move transition-all hover:shadow-md ${
                                  draggedItem === item.id ? 'opacity-50' : ''
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <GripVertical className="w-5 h-5 text-gray-400" />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium text-lg">{item.anonymousId}</span>
                                      <Badge variant="outline" className="text-sm">
                                        Rank #{item.rank}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-700">{item.content}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {rankings.length > 0 && (
                              <div className="text-xs text-gray-500 text-center mt-4">
                                Drag and drop to reorder answers from best to worst
                              </div>
                            )}
                          </div>
                        ) : (
                          // Traditional Mode - Named Authors with Ratings
                          <>
                            <div className="p-4 border border-gray-200 rounded-lg bg-blue-50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-800">Assistant Kumar</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-600">2 days ago</span>
                                  <div className="flex">
                                    {[1,2,3,4,5].map((star) => (
                                      <Star key={star} className="w-3 h-3 fill-current text-yellow-400" />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">
                                For paddy cultivation, ensure proper water management with 2-3 inches of standing water during vegetative stage. Use organic fertilizers like vermicompost and neem cake. Monitor for pests like stem borer and use pheromone traps.
                              </p>
                              <div className="text-xs text-gray-500 italic">
                                "Very helpful advice for sustainable farming"
                              </div>
                            </div>

                            <div className="p-4 border border-gray-200 rounded-lg bg-green-50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-green-800">Assistant Priya</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-600">1 day ago</span>
                                  <div className="flex">
                                    {[1,2,3,4].map((star) => (
                                      <Star key={star} className="w-3 h-3 fill-current text-yellow-400" />
                                    ))}
                                    <Star className="w-3 h-3 text-gray-300" />
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">
                                Consider crop rotation with legumes to improve soil fertility. Test soil pH and adjust accordingly. For irrigation, drip irrigation systems are more efficient than traditional flooding methods.
                              </p>
                              <div className="text-xs text-gray-500 italic">
                                "Good suggestions for modern farming techniques"
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Rating/Review Section */}
                    {isBlindReview ? (
                      // Blind Review Mode - Direct submission
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <Label className="text-sm font-medium mb-2 block">
                          Blind Review Complete:
                        </Label>
                        <p className="text-sm text-gray-600 mb-3">
                          You've ranked all answers from best to worst. Borda Count will be calculated automatically.
                        </p>
                        <div className="text-xs text-gray-500">
                          Ranking: {rankings.map(r => `${r.anonymousId}(#${r.rank})`).join(' → ')}
                        </div>
                      </div>
                    ) : (
                      // Traditional Mode - Star ratings and comments
                      <>
                        {/* Rating Section */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Rate Other Answers (1-5 stars):
                          </Label>
                          <RadioGroup
                            value={reviewForm.score}
                            onValueChange={(value) => setReviewForm((prev: ReviewFormData) => ({ ...prev, score: value }))}
                            className="flex gap-4"
                          >
                            {[1, 2, 3, 4, 5].map((score) => (
                              <div key={score} className="flex items-center space-x-2">
                                <RadioGroupItem value={score.toString()} id={`score-${score}`} />
                                <Label htmlFor={`score-${score}`} className="flex items-center gap-1 cursor-pointer">
                                  {score} <Star className="w-4 h-4 fill-current text-yellow-400" />
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>

                        {/* Comments Section */}
                        <div>
                          <Label htmlFor="comments" className="text-sm font-medium">
                            Your Comments on Other Answers:
                          </Label>
                          <Textarea
                            id="comments"
                            placeholder="Share your insights about the other assistants' answers..."
                            value={reviewForm.comments}
                            onChange={(e) => setReviewForm((prev: ReviewFormData) => ({ ...prev, comments: e.target.value }))}
                            className="mt-2"
                            rows={4}
                          />
                        </div>
                      </>
                    )}

                    {/* Your Answer Section */}
                    <div>
                      <Label htmlFor="user-answer" className="text-sm font-medium">
                        Your Agricultural Assistance Answer:
                      </Label>
                      <Textarea
                        id="user-answer"
                        placeholder="Provide your expert agricultural assistance answer..."
                        value={reviewForm.similarity ? reviewForm.similarity.toString() : ''}
                        onChange={(e) => setReviewForm((prev: ReviewFormData) => ({ ...prev, similarity: e.target.value }))}
                        className="mt-2"
                        rows={6}
                      />
                    </div>

                    <Button
                      onClick={handleSubmitReview}
                      disabled={
                        isBlindReview 
                          ? rankings.length === 0 || !reviewForm.similarity
                          : !reviewForm.score || !reviewForm.comments || !reviewForm.similarity || submitReviewMutation.isPending
                      }
                      className="w-full"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {submitReviewMutation.isPending ? 'Submitting...' : 
                       isBlindReview ? 'Submit Blind Rankings & Answer' : 'Submit Assistance Answer'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a question to provide agricultural assistance</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          {statsLoading ? (
            <div className="text-center py-8">Loading statistics...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAssignments}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingReviews}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Completed Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.completedReviews}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalAssignments > 0 ? Math.round((stats.acceptedAssignments / stats.totalAssignments) * 100) : 0}%
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
