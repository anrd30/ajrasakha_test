import { Card, CardContent, CardHeader, CardTitle } from './atoms/card';
import { Button } from './atoms/button';
import { Badge } from './atoms/badge';
import { Clock, MessageSquare, Star } from 'lucide-react';
import { useGetMyReviewAssignments } from '@/hooks/api/peer-review';

// Create a context or prop to handle tab switching
interface ReviewFeedProps {
  onNavigateToReviews?: () => void;
}

export const ReviewFeed = ({ onNavigateToReviews }: ReviewFeedProps = {}) => {
  const { data: assignmentsData, isLoading } = useGetMyReviewAssignments();

  const assignments = assignmentsData || [];
  const pendingAssignments = assignments.filter(
    (assignmentData) => assignmentData.assignment.status === 'pending'
  );

  const handleViewReviews = () => {
    if (onNavigateToReviews) {
      onNavigateToReviews();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Pending Reviews</CardTitle>
          <Badge variant="outline" className="text-blue-600">
            {pendingAssignments.length} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {pendingAssignments.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No pending reviews</p>
            <p className="text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingAssignments.slice(0, 3).map((assignmentData) => (
              <div
                key={assignmentData.assignment._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium">
                      Assignment #{assignmentData.assignment._id.slice(-6)}
                    </span>
                    <Badge
                      variant={
                        assignmentData.assignment.priority === 'high' ? 'destructive' :
                        assignmentData.assignment.priority === 'urgent' ? 'destructive' :
                        'secondary'
                      }
                      className="text-xs"
                    >
                      {assignmentData.assignment.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">
                    Due: {assignmentData.assignment.dueDate ?
                      new Date(assignmentData.assignment.dueDate).toLocaleDateString() :
                      'No due date'
                    }
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleViewReviews}
                >
                  Review
                </Button>
              </div>
            ))}

            {pendingAssignments.length > 3 && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewReviews}
                  className="text-blue-600 hover:text-blue-700"
                >
                  View all {pendingAssignments.length} reviews
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t">
          <Button
            onClick={handleViewReviews}
            className="w-full"
            variant="outline"
          >
            <Star className="w-4 h-4 mr-2" />
            Go to Review Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
