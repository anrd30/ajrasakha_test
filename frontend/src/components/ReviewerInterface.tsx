import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './atoms/card';
import { Button } from './atoms/button';
import { Textarea } from './atoms/textarea';
import { Label } from './atoms/label';
import { RadioGroup, RadioGroupItem } from './atoms/radio-group';
import { Badge } from './atoms/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './atoms/tabs';
import { CheckCircle, Clock, AlertCircle, Star, MessageSquare } from 'lucide-react';
import {
  useGetMyReviewAssignments,
  useGetMyReviewStats,
  useSubmitReview,
  useUpdateAssignmentStatus,
  type ReviewAssignment
} from '@/hooks/api/peer-review';
import toast from 'react-hot-toast';

export const ReviewerInterface = () => {
  const [selectedAssignment, setSelectedAssignment] = useState<ReviewAssignment | null>(null);
  const [reviewForm, setReviewForm] = useState({
    score: '',
    comments: '',
    similarity: '',
  });

  // API hooks
  const { data: assignmentsData, isLoading: assignmentsLoading } = useGetMyReviewAssignments();
  const { data: statsData, isLoading: statsLoading } = useGetMyReviewStats();
  const submitReviewMutation = useSubmitReview();
  const updateAssignmentStatusMutation = useUpdateAssignmentStatus();

  const assignments = assignmentsData || [];
  const stats = statsData || {
    totalAssignments: 0,
    pendingReviews: 0,
    completedReviews: 0,
    acceptedAssignments: 0,
    declinedAssignments: 0,
  };

  const handleAcceptAssignment = async (assignmentId: string) => {
    try {
      await updateAssignmentStatusMutation.mutateAsync({
        assignmentId,
        status: 'accepted'
      });
      toast.success('Assignment accepted successfully');
    } catch (error) {
      toast.error('Failed to accept assignment');
    }
  };

  const handleDeclineAssignment = async (assignmentId: string) => {
    try {
      await updateAssignmentStatusMutation.mutateAsync({
        assignmentId,
        status: 'declined'
      });
      toast.success('Assignment declined');
    } catch (error) {
      toast.error('Failed to decline assignment');
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedAssignment?.review) return;

    try {
      await submitReviewMutation.mutateAsync({
        reviewId: selectedAssignment.review._id,
        score: parseInt(reviewForm.score),
        comments: reviewForm.comments || undefined,
        similarity: reviewForm.similarity ? parseFloat(reviewForm.similarity) : undefined,
      });

      toast.success('Review submitted successfully!');
      setReviewForm({ score: '', comments: '', similarity: '' });
      setSelectedAssignment(null);
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="text-blue-600"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'declined':
        return <Badge variant="outline" className="text-red-600"><AlertCircle className="w-3 h-3 mr-1" />Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium Priority</Badge>;
      case 'low':
        return <Badge variant="outline">Low Priority</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Peer Review Dashboard</h1>
        <p className="text-gray-600">Manage your review assignments and submit feedback</p>
      </div>

      <Tabs defaultValue="assignments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="assignments">My Assignments</TabsTrigger>
          <TabsTrigger value="stats">Review Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-6">
          {assignmentsLoading ? (
            <div className="text-center py-8">Loading assignments...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assignments List */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Review Assignments</h2>
                {assignments.map((assignmentData) => (
                  <Card
                    key={assignmentData.assignment._id}
                    className={`cursor-pointer transition-colors ${
                      selectedAssignment?.assignment._id === assignmentData.assignment._id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedAssignment(assignmentData)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2 line-clamp-2">
                            Assignment #{assignmentData.assignment._id.slice(-6)}
                          </CardTitle>
                          <div className="flex gap-2 mb-2">
                            {getStatusBadge(assignmentData.assignment.status)}
                            {getPriorityBadge(assignmentData.assignment.priority)}
                          </div>
                          <p className="text-sm text-gray-600">
                            Assigned {new Date(assignmentData.assignment.assignedAt).toLocaleDateString()}
                            {assignmentData.assignment.dueDate && ` • Due ${new Date(assignmentData.assignment.dueDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm line-clamp-3 mb-3">
                        {assignmentData.review ? `Review Status: ${assignmentData.review.status}` : 'No review data available'}
                      </p>
                      {assignmentData.assignment.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptAssignment(assignmentData.assignment._id);
                            }}
                            disabled={updateAssignmentStatusMutation.isPending}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeclineAssignment(assignmentData.assignment._id);
                            }}
                            disabled={updateAssignmentStatusMutation.isPending}
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

            {/* Review Form */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Submit Review</h2>
              {selectedAssignment ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Review Assignment</CardTitle>
                    <p className="text-sm text-gray-600">
                      Assignment #{selectedAssignment.assignment._id.slice(-6)}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="score">Score (1-5)</Label>
                      <RadioGroup
                        value={reviewForm.score}
                        onValueChange={(value) => setReviewForm(prev => ({ ...prev, score: value }))}
                        className="flex gap-4 mt-2"
                      >
                        {[1, 2, 3, 4, 5].map((score) => (
                          <div key={score} className="flex items-center space-x-2">
                            <RadioGroupItem value={score.toString()} id={`score-${score}`} />
                            <Label htmlFor={`score-${score}`} className="flex items-center gap-1">
                              {score} <Star className="w-3 h-3 fill-current" />
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div>
                      <Label htmlFor="comments">Comments (Optional)</Label>
                      <Textarea
                        id="comments"
                        placeholder="Provide feedback on the answer..."
                        value={reviewForm.comments}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, comments: e.target.value }))}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="similarity">Similarity Score (0-1, Optional)</Label>
                      <input
                        id="similarity"
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        placeholder="0.8"
                        value={reviewForm.similarity}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, similarity: e.target.value }))}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <Button
                      onClick={handleSubmitReview}
                      disabled={!reviewForm.score || submitReviewMutation.isPending}
                      className="w-full"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select an assignment to submit a review</p>
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
